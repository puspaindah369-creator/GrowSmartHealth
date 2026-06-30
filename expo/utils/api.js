// ============================================================
// GrowSmart Health - API Client
// ============================================================

// // IP_LAPTOP adalah alamat IP laptop/komputer yang menjalankan backend.
// const IP_LAPTOP = '10.10.51.44';
// PORT adalah port backend, harus sama dengan port server Python di backend/app.py.
const PORT = 5000;
// Base URL backend Flask/API yang dipakai aplikasi Expo.
export const BASE_URL = 'https://growsmarthealth-production.up.railway.app';
// API_URL adalah endpoint khusus untuk proses prediksi status gizi.
const API_URL = `${BASE_URL}/predict`;

// Mengecek apakah backend aktif melalui endpoint health.
export async function getHealth() {
  // Mengirim request GET ke endpoint /health.
  const response = await fetch(`${BASE_URL}/health`);
  // Jika status HTTP bukan 2xx, berarti backend merespons error.
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // Mengubah response dari backend menjadi object JSON.
  return response.json();
}

// Label urutan kelas untuk indikator BB/U (Weight-for-Age).
const WA_LABELS = ['Normal', 'Underfed', 'Malnutrition', 'Overnutrition'];
// Label urutan kelas untuk indikator TB/U (Height-for-Age).
const HA_LABELS = ['Not Stunted', 'Stunted'];
// Label urutan kelas untuk indikator BB/TB (Weight-for-Height).
const WH_LABELS = ['Normal', 'Thin', 'Very Thin', 'Obese'];

// Klasifikasi Weight-for-Age berdasarkan batas z-score WHO.
function classifyWaByWho(z) {
  // z > 2 artinya berat badan lebih dari standar usia.
  if (z > 2) return { result: 'Overnutrition', cls: 'info', winnerIdx: 3 };
  // -2 sampai 2 dianggap normal menurut batas z-score.
  if (z >= -2) return { result: 'Normal', cls: 'normal', winnerIdx: 0 };
  // -3 sampai kurang dari -2 menunjukkan berat badan kurang.
  if (z >= -3) return { result: 'Underfed', cls: 'warning', winnerIdx: 1 };
  // z < -3 menunjukkan kondisi gizi buruk/malnutrition.
  return { result: 'Malnutrition', cls: 'danger', winnerIdx: 2 };
}

// Klasifikasi Height-for-Age untuk menentukan status stunting.
function classifyHaByWho(z) {
  // Jika z-score tinggi badan kurang dari -2, anak masuk kategori stunted.
  return z < -2
    ? { result: 'Stunted', cls: 'danger', winnerIdx: 1 }
    // Jika tidak kurang dari -2, status tinggi badan dianggap tidak stunted.
    : { result: 'Not Stunted', cls: 'normal', winnerIdx: 0 };
}

// Klasifikasi Weight-for-Height/BMI berdasarkan batas z-score WHO.
function classifyWhByWho(z) {
  // z > 2 menunjukkan berat terhadap tinggi cenderung berlebih.
  if (z > 2) return { result: 'Obese', cls: 'info', winnerIdx: 3 };
  // -2 sampai 2 dianggap proporsi berat dan tinggi normal.
  if (z >= -2) return { result: 'Normal', cls: 'normal', winnerIdx: 0 };
  // -3 sampai kurang dari -2 menunjukkan anak kurus.
  if (z >= -3) return { result: 'Thin', cls: 'warning', winnerIdx: 1 };
  // z < -3 menunjukkan anak sangat kurus.
  return { result: 'Very Thin', cls: 'danger', winnerIdx: 2 };
}

// Mengubah hasil indikator agar konsisten dengan label dan probabilitas lokal.
function applyWhoMapping(indicator, labels, classifier) {
  // Ambil nilai z-score dari indikator dan ubah ke Number.
  const z = Number(indicator?.z);
  // Jika z-score tidak valid, kembalikan indikator asli tanpa perubahan.
  if (!Number.isFinite(z)) return indicator;

  // Jalankan fungsi classifier sesuai jenis indikator.
  const mapped = classifier(z);
  // Gabungkan data indikator lama dengan hasil mapping WHO terbaru.
  return {
    // Spread menjaga field lain seperti model_name/model_scope tetap ada.
    ...indicator,
    // result diganti dengan kategori hasil dari classifier lokal.
    result: mapped.result,
    // cls dipakai UI untuk menentukan warna/status visual.
    cls: mapped.cls,
    // labels dipakai untuk urutan probabilitas di grafik/komponen hasil.
    labels,
    // probs dibuat ulang agar cocok dengan label dan winnerIdx.
    probs: zProbs(z, labels, mapped.winnerIdx),
  };
}

// Mengirim data antropometri ke backend dan mengembalikan hasil prediksi.
export async function predict(age, weight, height, gender, dateOfBirth, dateOfMeasurement) {
  // Bentuk payload disesuaikan dengan nama field yang diterima backend.
  const body = { age, weight, height, gender, date_of_birth: dateOfBirth, date_of_measurement: dateOfMeasurement };
  // Log ini membantu debugging untuk memastikan data yang dikirim sudah benar.
  console.log('Kirim ke backend:', body);
  // Log URL membantu mengecek apakah aplikasi mengarah ke backend yang benar.
  console.log('URL:', API_URL);

  try {
    // Request utama ke endpoint prediksi backend.
    const response = await fetch(API_URL, {
      // Method POST dipakai karena aplikasi mengirim data input untuk diproses.
      method: 'POST',
      // Header memberi tahu backend bahwa body request berbentuk JSON.
      headers: { 'Content-Type': 'application/json' },
      // Body harus diubah ke string JSON sebelum dikirim lewat fetch.
      body: JSON.stringify(body),
    });

    // Jika backend mengembalikan status error, pindahkan proses ke catch.
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    // Ambil response prediksi dari backend dalam bentuk object.
    const data = await response.json();
    // Log response mentah untuk membantu cek struktur data dari backend.
    console.log('Response backend raw:', JSON.stringify(data));

    // Menyamakan nama class dari backend dengan class yang dipakai UI.
    const fixCls = (cls) => {
      // Backend lama bisa mengirim "ok", UI memakai "normal".
      if (cls === 'ok') return 'normal';
      // Backend lama bisa mengirim "pur", UI memakai "info".
      if (cls === 'pur') return 'info';
      // Backend lama bisa mengirim "err", UI memakai "danger".
      if (cls === 'err') return 'danger';
      // Backend lama bisa mengirim "warn", UI memakai "warning".
      if (cls === 'warn') return 'warning';
      // Jika class sudah sesuai format UI, kembalikan apa adanya.
      return cls;
    };

    // Normalisasi hasil Weight-for-Age dari backend.
    const wa = {
        // result adalah label status BB/U dari backend.
        result: data.wa.result,
        // cls dipakai untuk warna dan tingkat risiko di UI.
        cls: fixCls(data.wa.cls),
        // z diubah ke string supaya aman ditampilkan walau nilainya kosong.
        z: String(data.wa.z ?? '-'),
        // probs berisi probabilitas tiap label untuk indikator BB/U.
        probs: data.wa.probs,
        // labels berisi daftar label BB/U yang akan ditampilkan.
        labels: data.wa.labels,
        // model_name memberi informasi model apa yang menghasilkan prediksi.
        model_name: data.wa.model_name,
        // model_scope menjelaskan sumber model, misalnya combined/gender/dataset_lookup.
        model_scope: data.wa.model_scope,
      };

    // Normalisasi hasil Height-for-Age dari backend.
    const ha = {
        // result adalah label status TB/U dari backend.
        result: data.ha.result,
        // cls dipakai untuk warna dan tingkat risiko di UI.
        cls: fixCls(data.ha.cls),
        // z diubah ke string supaya aman ditampilkan walau nilainya kosong.
        z: String(data.ha.z ?? '-'),
        // probs berisi probabilitas tiap label untuk indikator TB/U.
        probs: data.ha.probs,
        // labels berisi daftar label TB/U yang akan ditampilkan.
        labels: data.ha.labels,
        // model_name memberi informasi model apa yang menghasilkan prediksi.
        model_name: data.ha.model_name,
        // model_scope menjelaskan sumber model, misalnya combined/gender/dataset_lookup.
        model_scope: data.ha.model_scope,
      };

    // Normalisasi hasil Weight-for-Height dari backend.
    const wh = {
        // result adalah label status BB/TB dari backend.
        result: data.wh.result,
        // cls dipakai untuk warna dan tingkat risiko di UI.
        cls: fixCls(data.wh.cls),
        // z diubah ke string supaya aman ditampilkan walau nilainya kosong.
        z: String(data.wh.z ?? '-'),
        // probs berisi probabilitas tiap label untuk indikator BB/TB.
        probs: data.wh.probs,
        // labels berisi daftar label BB/TB yang akan ditampilkan.
        labels: data.wh.labels,
        // model_name memberi informasi model apa yang menghasilkan prediksi.
        model_name: data.wh.model_name,
        // model_scope menjelaskan sumber model, misalnya combined/gender/dataset_lookup.
        model_scope: data.wh.model_scope,
      };

    // Menentukan status keseluruhan berdasarkan status terburuk dari indikator.
    // Jika salah satu indikator danger, overall langsung dianggap buruk.
    const isDanger = wa.cls === 'danger' || ha.cls === 'danger' || wh.cls === 'danger';
    // Warning/info pada BB/U atau BB/TB membuat overall menjadi perhatian.
    const isWarn = wa.cls === 'warning' || wa.cls === 'info' || wh.cls === 'warning' || wh.cls === 'info';

    // Object ini adalah format final yang dipakai halaman Hasil.
    return {
      // Hasil indikator BB/U.
      wa,
      // Hasil indikator TB/U.
      ha,
      // Hasil indikator BB/TB.
      wh,
      // Status ringkasan untuk menentukan badge utama di halaman hasil.
      overall: isDanger ? 'buruk' : isWarn ? 'perhatian' : 'normal',
      // Gunakan input dari backend jika tersedia; jika tidak, pakai input dari frontend.
      input: data.input || {
        age,
        weight,
        height,
        gender,
        date_of_birth: dateOfBirth,
        date_of_measurement: dateOfMeasurement,
      },
      // Metadata menjelaskan mode model yang digunakan.
      meta: data.meta || {
        // configured_model_mode adalah mode yang dikonfigurasi di backend.
        configured_model_mode: 'combined',
        // active_model_mode adalah mode yang benar-benar dipakai saat prediksi.
        active_model_mode: 'combined',
        // Menandai bahwa tanggal lahir ikut dipakai sebagai fitur/input.
        date_of_birth_used: true,
      },
    };
  } catch (err) {
    // Jika backend gagal dihubungi, aplikasi tetap bisa berjalan dengan prediksi lokal.
    console.warn('Backend error, pakai prediksi lokal. Error:', err.message);
    return predictLocal(age, weight, height, gender, dateOfBirth, dateOfMeasurement);
  }
}

// Fallback prediksi lokal (WHO z-score)
// Tabel median/SD sederhana dipisah berdasarkan jenis kelamin sesuai standar WHO.
const WHO_REFERENCE = {
  M: {
    weightMedian: { 0: 3.3, 1: 4.5, 2: 5.6, 3: 6.4, 4: 7.0, 5: 7.5, 6: 7.9, 7: 8.3, 8: 8.6, 9: 8.9, 10: 9.2, 11: 9.4, 12: 9.6, 15: 10.3, 18: 10.9, 21: 11.5, 24: 12.2, 27: 12.7, 30: 13.3, 33: 13.8, 36: 14.3, 39: 14.8, 42: 15.3, 45: 15.7, 48: 16.2, 51: 16.7, 54: 17.2, 57: 17.7, 59: 18.0 },
    weightSd: { 0: 0.45, 3: 0.75, 6: 0.85, 9: 0.95, 12: 1.08, 18: 1.25, 24: 1.4, 30: 1.55, 36: 1.75, 42: 1.95, 48: 2.12, 54: 2.38, 59: 2.52 },
    heightMedian: { 0: 49.9, 1: 54.7, 2: 58.4, 3: 61.4, 4: 63.9, 5: 65.9, 6: 67.6, 7: 69.2, 8: 70.6, 9: 72.0, 10: 73.3, 11: 74.5, 12: 75.7, 15: 79.1, 18: 82.3, 21: 85.1, 24: 87.8, 27: 90.4, 30: 92.9, 33: 95.2, 36: 96.1, 39: 98.7, 42: 100.6, 45: 102.5, 48: 104.3, 51: 106.0, 54: 107.7, 57: 109.4, 59: 110.5 },
    heightSd: { 0: 1.9, 3: 2.3, 6: 2.5, 9: 2.6, 12: 2.7, 18: 2.9, 24: 3.05, 30: 3.2, 36: 3.7, 42: 4.0, 48: 4.2, 54: 4.25, 59: 4.25 },
    bmiMedian: 16.1,
  },
  F: {
    weightMedian: { 0: 3.2, 1: 4.2, 2: 5.1, 3: 5.8, 4: 6.4, 5: 6.9, 6: 7.3, 7: 7.6, 8: 7.9, 9: 8.2, 10: 8.5, 11: 8.7, 12: 8.9, 15: 9.6, 18: 10.2, 21: 10.9, 24: 11.5, 27: 12.1, 30: 12.7, 33: 13.3, 36: 13.9, 39: 14.4, 42: 15.0, 45: 15.5, 48: 16.1, 51: 16.6, 54: 17.2, 57: 17.7, 59: 18.0 },
    weightSd: { 0: 0.45, 3: 0.68, 6: 0.9, 9: 0.95, 12: 1.12, 18: 1.28, 24: 1.45, 30: 1.65, 36: 1.82, 42: 2.02, 48: 2.3, 54: 2.6, 59: 2.8 },
    heightMedian: { 0: 49.1, 1: 53.7, 2: 57.1, 3: 59.8, 4: 62.1, 5: 64.0, 6: 65.7, 7: 67.3, 8: 68.7, 9: 70.1, 10: 71.5, 11: 72.8, 12: 74.0, 15: 77.5, 18: 80.7, 21: 83.7, 24: 86.4, 27: 88.8, 30: 91.2, 33: 93.5, 36: 95.1, 39: 97.7, 42: 99.8, 45: 101.8, 48: 103.8, 51: 105.6, 54: 107.4, 57: 109.1, 59: 110.1 },
    heightSd: { 0: 1.85, 3: 2.2, 6: 2.28, 9: 2.48, 12: 2.58, 18: 2.88, 24: 3.05, 30: 3.2, 36: 3.82, 42: 4.0, 48: 4.3, 54: 4.35, 59: 4.35 },
    bmiMedian: 15.8,
  },
};

function genderCode(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (['f', 'female', 'p', 'perempuan', 'wanita'].includes(raw)) return 'F';
  return 'M';
}

// Interpolasi nilai median/SD berdasarkan umur ketika umur tidak ada persis di tabel.
function interp(table, x) {
  // Ambil semua key umur dari tabel lalu urutkan dari kecil ke besar.
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  // Jika umur lebih kecil dari data pertama, gunakan nilai pertama.
  if (x <= keys[0]) return table[keys[0]];
  // Jika umur lebih besar dari data terakhir, gunakan nilai terakhir.
  if (x >= keys[keys.length - 1]) return table[keys[keys.length - 1]];

  // Cari dua titik umur yang mengapit umur input.
  for (let i = 0; i < keys.length - 1; i++) {
    if (x >= keys[i] && x <= keys[i + 1]) {
      // r adalah posisi relatif umur input di antara dua titik referensi.
      const r = (x - keys[i]) / (keys[i + 1] - keys[i]);
      // Hitung nilai tengah dengan interpolasi linear.
      return table[keys[i]] + r * (table[keys[i + 1]] - table[keys[i]]);
    }
  }
  // Fallback terakhir jika loop tidak menemukan rentang.
  return table[keys[0]];
}

// Mengubah skor mentah menjadi distribusi probabilitas.
function softmax(arr) {
  // max dipakai agar perhitungan eksponensial lebih stabil.
  const max = Math.max(...arr);
  // Ubah setiap skor menjadi nilai eksponensial.
  const exps = arr.map((v) => Math.exp(v - max));
  // Jumlah semua nilai eksponensial dipakai sebagai pembagi.
  const sum = exps.reduce((a, b) => a + b, 0);
  // Tiap nilai dibagi total sehingga hasilnya menjadi probabilitas.
  return exps.map((v) => v / sum);
}

// Membuat probabilitas dummy berbasis z-score agar format lokal mirip respons backend.
function zProbs(z, labels, winnerIdx) {
  // Kelas pemenang diberi skor lebih tinggi daripada kelas lain.
  const base = labels.map((_, i) => (i === winnerIdx ? Math.abs(z) * 1.8 + 2 : 0.2 + i * 0.04));
  // Softmax mengubah skor base menjadi probabilitas.
  const probs = softmax(base);
  // Gabungkan label dengan probabilitasnya menjadi object.
  return Object.fromEntries(labels.map((l, i) => [l, probs[i]]));
}

// Prediksi cadangan yang berjalan di aplikasi ketika backend tidak tersedia.
function predictLocal(age, weight, height, gender, dateOfBirth, dateOfMeasurement) {
  const ref = WHO_REFERENCE[genderCode(gender)];
  // Hitung z-score Weight-for-Age.
  // Ambil median BB/U sesuai usia.
  const waMed = interp(ref.weightMedian, age);
  // Ambil standar deviasi BB/U sesuai usia.
  const waSD = interp(ref.weightSd, age);
  // Rumus z-score: nilai aktual dikurangi median, lalu dibagi SD.
  const waZ = (weight - waMed) / waSD;
  // Mapping z-score BB/U menjadi kategori status.
  const waMapped = classifyWaByWho(waZ);

  // Hitung z-score Height-for-Age.
  // Ambil median TB/U sesuai usia.
  const haMed = interp(ref.heightMedian, age);
  // Ambil standar deviasi TB/U sesuai usia.
  const haSD = interp(ref.heightSd, age);
  // Rumus z-score tinggi badan terhadap usia.
  const haZ = (height - haMed) / haSD;
  // Mapping z-score TB/U menjadi kategori stunting atau tidak.
  const haMapped = classifyHaByWho(haZ);

  // Hitung indikator Weight-for-Height menggunakan pendekatan BMI sederhana.
  // BMI dihitung dari berat badan dibagi kuadrat tinggi dalam meter.
  const bmi = weight / Math.pow(height / 100, 2);
  // whZ adalah pendekatan z-score BB/TB berbasis BMI.
  const whZ = (bmi - ref.bmiMedian) / 2;
  // Mapping z-score BB/TB menjadi kategori normal/kurus/sangat kurus/obese.
  const whMapped = classifyWhByWho(whZ);

  // Ringkasan status mengikuti indikator dengan tingkat risiko tertinggi.
  // Jika ada indikator danger, overall menjadi buruk.
  const isDanger = waMapped.cls === 'danger' || haMapped.cls === 'danger' || whMapped.cls === 'danger';
  // Jika tidak danger tetapi ada warning/info pada BB/U atau BB/TB, overall menjadi perhatian.
  const isWarn = waMapped.cls === 'warning' || waMapped.cls === 'info' || whMapped.cls === 'warning' || whMapped.cls === 'info';

  // Bentuk output lokal dibuat sama seperti output backend agar screen Hasil tidak perlu dibedakan.
  return {
    // Hasil BB/U lokal lengkap dengan z-score, probabilitas, dan label.
    wa: { result: waMapped.result, cls: waMapped.cls, z: waZ.toFixed(2), probs: zProbs(waZ, WA_LABELS, waMapped.winnerIdx), labels: WA_LABELS },
    // Hasil TB/U lokal lengkap dengan z-score, probabilitas, dan label.
    ha: { result: haMapped.result, cls: haMapped.cls, z: haZ.toFixed(2), probs: zProbs(haZ, HA_LABELS, haMapped.winnerIdx), labels: HA_LABELS },
    // Hasil BB/TB lokal lengkap dengan z-score, probabilitas, dan label.
    wh: { result: whMapped.result, cls: whMapped.cls, z: whZ.toFixed(2), probs: zProbs(whZ, WH_LABELS, whMapped.winnerIdx), labels: WH_LABELS },
    // Status keseluruhan yang akan menjadi badge utama.
    overall: isDanger ? 'buruk' : isWarn ? 'perhatian' : 'normal',
    // Input asli disimpan agar bisa ditampilkan lagi di halaman hasil/riwayat.
    input: {
      age,
      weight,
      height,
      gender,
      date_of_birth: dateOfBirth,
      date_of_measurement: dateOfMeasurement,
    },
    // Metadata fallback agar struktur sama seperti respons backend.
    meta: {
      configured_model_mode: 'combined',
      active_model_mode: 'combined',
      date_of_birth_used: true,
      who_reference_gender: genderCode(gender),
    },
  };
}
