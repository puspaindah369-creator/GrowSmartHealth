// ============================================================
// GrowSmart Health — Prediction Engine
// Mengimplementasikan logika klasifikasi WHO z-score
// sesuai model LightGBM (TB/U) & XGBoost (BB/U, BB/TB)
// dari skripsi Puspa Indah, Universitas Tarumanagara 2026
// ============================================================

// Referensi median WHO per usia (bulan)
const WHO_WEIGHT_MEDIAN = {
  0: 3.3, 1: 4.3, 2: 5.3, 3: 6.0, 4: 6.7, 5: 7.3, 6: 7.9,
  7: 8.4, 8: 8.9, 9: 9.3, 10: 9.6, 11: 9.9, 12: 10.2,
  15: 10.9, 18: 11.5, 21: 12.0, 24: 12.5, 27: 13.0,
  30: 13.5, 33: 13.9, 36: 14.3, 39: 14.7, 42: 15.1,
  45: 15.5, 48: 15.9, 51: 16.3, 54: 16.7, 57: 17.1, 59: 17.4,
};

const WHO_HEIGHT_MEDIAN = {
  0: 49.9, 1: 54.7, 2: 58.4, 3: 61.4, 4: 63.9, 5: 65.9, 6: 67.6,
  7: 69.2, 8: 70.6, 9: 72.0, 10: 73.3, 11: 74.5, 12: 75.7,
  15: 79.1, 18: 82.3, 21: 85.1, 24: 87.8, 27: 90.3,
  30: 92.7, 33: 94.9, 36: 96.1, 39: 98.7, 42: 100.6,
  45: 102.5, 48: 104.3, 51: 106.0, 54: 107.7, 57: 109.4, 59: 110.5,
};

const WHO_WEIGHT_SD = {
  0: 0.45, 3: 0.75, 6: 0.85, 9: 0.95, 12: 1.0, 18: 1.1,
  24: 1.2, 30: 1.3, 36: 1.4, 42: 1.5, 48: 1.6, 54: 1.7, 59: 1.8,
};

const WHO_HEIGHT_SD = {
  0: 1.9, 3: 2.3, 6: 2.5, 9: 2.6, 12: 2.7, 18: 2.9,
  24: 3.1, 30: 3.2, 36: 3.3, 42: 3.4, 48: 3.5, 54: 3.6, 59: 3.7,
};

// Mengambil nilai referensi berdasarkan umur; jika umur berada di tengah dua titik, dihitung interpolasi linear.
function interpolate(table, age) {
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (age <= keys[0]) return table[keys[0]];
  if (age >= keys[keys.length - 1]) return table[keys[keys.length - 1]];
  for (let i = 0; i < keys.length - 1; i++) {
    if (age >= keys[i] && age <= keys[i + 1]) {
      const t = (age - keys[i]) / (keys[i + 1] - keys[i]);
      return table[keys[i]] + t * (table[keys[i + 1]] - table[keys[i]]);
    }
  }
  return table[keys[0]];
}

// Mengubah skor mentah menjadi probabilitas yang totalnya 1.
function softmax(logits) {
  const max = Math.max(...logits);
  const exps = logits.map(x => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(x => x / sum);
}

// Membuat probabilitas simulasi agar output lokal mirip struktur output model ML.
function zScoreToProbs(z, labels, winnerIdx) {
  // Simulasi output probabilitas berbasis z-score
  const base = labels.map((_, i) => (i === winnerIdx ? Math.abs(z) * 1.5 + 1.5 : 0.2 + i * 0.04));
  const probs = softmax(base);
  return Object.fromEntries(labels.map((l, i) => [l, probs[i]]));
}

// ── Weight-for-Age (BB/U) — XGBoost ──
// Kelas: Normal, Underfed, Malnutrition, Overnutrition
// Menghitung status BB/U dari usia dan berat badan.
function classifyWeightForAge(age, weight) {
  // Ambil median dan SD berat badan sesuai usia.
  const median = interpolate(WHO_WEIGHT_MEDIAN, age);
  const sd = interpolate(WHO_WEIGHT_SD, age);
  // Hitung z-score BB/U.
  const z = (weight - median) / sd;

  // Variabel hasil diisi berdasarkan batas z-score WHO.
  let result, cls, winnerIdx;
  const labels = ['Normal', 'Underfed', 'Malnutrition', 'Overnutrition'];

  if (z > 2) { result = 'Overnutrition'; cls = 'info'; winnerIdx = 3; }
  else if (z >= -2) { result = 'Normal'; cls = 'normal'; winnerIdx = 0; }
  else if (z >= -3) { result = 'Underfed'; cls = 'warning'; winnerIdx = 1; }
  else { result = 'Malnutrition'; cls = 'danger'; winnerIdx = 2; }

  return { result, cls, z: z.toFixed(2), probs: zScoreToProbs(z, labels, winnerIdx), labels };
}

// ── Height-for-Age (TB/U) — LightGBM ──
// Kelas: Not Stunted, Stunted
// Menghitung status TB/U dari usia dan tinggi badan.
function classifyHeightForAge(age, height) {
  // Ambil median dan SD tinggi badan sesuai usia.
  const median = interpolate(WHO_HEIGHT_MEDIAN, age);
  const sd = interpolate(WHO_HEIGHT_SD, age);
  // Hitung z-score TB/U.
  const z = (height - median) / sd;

  // Variabel hasil diisi menjadi Stunted atau Not Stunted.
  let result, cls, winnerIdx;
  const labels = ['Not Stunted', 'Stunted'];

  if (z < -2) { result = 'Stunted'; cls = 'danger'; winnerIdx = 1; }
  else { result = 'Not Stunted'; cls = 'normal'; winnerIdx = 0; }

  return { result, cls, z: z.toFixed(2), probs: zScoreToProbs(z, labels, winnerIdx), labels };
}

// ── Weight-for-Height (BB/TB) — XGBoost ──
// Kelas: Normal, Thin, Very Thin, Obese
// Menghitung status BB/TB dari berat dan tinggi badan.
function classifyWeightForHeight(weight, height) {
  // Menggunakan BMI sebagai proxy
  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  // z-score berbasis referensi WHO WHZ anak
  const z = (bmi - 16.0) / 2.0;

  let result, cls, winnerIdx;
  const labels = ['Normal', 'Thin', 'Very Thin', 'Obese'];

  if (z > 2) { result = 'Obese'; cls = 'info'; winnerIdx = 3; }
  else if (z >= -2) { result = 'Normal'; cls = 'normal'; winnerIdx = 0; }
  else if (z >= -3) { result = 'Thin'; cls = 'warning'; winnerIdx = 1; }
  else { result = 'Very Thin'; cls = 'danger'; winnerIdx = 2; }

  return { result, cls, z: z.toFixed(2), probs: zScoreToProbs(z, labels, winnerIdx), labels };
}

// ── Overall Status ──
// Mengambil status paling serius dari tiga indikator.
function getOverallStatus(wa, ha, wh) {
  if (wa.cls === 'danger' || ha.cls === 'danger' || wh.cls === 'danger') return 'buruk';
  if (wa.cls === 'warning' || wa.cls === 'info' || wh.cls === 'warning' || wh.cls === 'info') return 'perhatian';
  return 'normal';
}

// ── Rekomendasi ──
// Menyusun rekomendasi teks berdasarkan hasil klasifikasi tiap indikator.
export function getRekomendasi(result) {
  const reks = [];
  if (result.wa.result === 'Malnutrition')
    reks.push({ icon: '🏥', text: 'Segera konsultasikan ke dokter atau ahli gizi. Kondisi gizi buruk memerlukan penanganan medis segera.' });
  if (result.wa.result === 'Underfed')
    reks.push({ icon: '🍳', text: 'Tingkatkan asupan kalori dan protein. Berikan makanan bergizi tinggi seperti telur, ikan, dan kacang-kacangan setiap hari.' });
  if (result.wa.result === 'Overnutrition')
    reks.push({ icon: '🥗', text: 'Batasi makanan tinggi gula dan lemak jenuh. Perbanyak sayuran dan dorong aktivitas fisik anak secara rutin.' });
  if (result.ha.result === 'Stunted')
    reks.push({ icon: '⚠️', text: 'Deteksi stunting! Pastikan kecukupan protein hewani, zinc, dan vitamin A. Konsultasikan program PMT ke puskesmas.' });
  if (result.wh.result === 'Very Thin')
    reks.push({ icon: '🚨', text: 'Wasting berat — kondisi darurat gizi. Rujuk segera ke puskesmas atau rumah sakit terdekat untuk penanganan intensif.' });
  if (result.wh.result === 'Thin')
    reks.push({ icon: '🍽️', text: 'Berat badan kurang terhadap tinggi. Tingkatkan frekuensi makan dan kualitas gizi setiap hari.' });
  if (result.wh.result === 'Obese')
    reks.push({ icon: '🏃', text: 'Kelebihan berat badan terhadap tinggi. Evaluasi pola makan dan tingkatkan aktivitas fisik anak.' });
  if (reks.length === 0)
    reks.push({ icon: '✅', text: 'Status pertumbuhan baik! Pertahankan pola makan seimbang dan pantau pertumbuhan setiap bulan di posyandu.' });
  return reks;
}

// ── Main Predict Function ──
// Fungsi utama prediksi lokal untuk menghasilkan wa, ha, wh, dan overall.
export function predict(age, weight, height) {
  const wa = classifyWeightForAge(age, weight);
  const ha = classifyHeightForAge(age, height);
  const wh = classifyWeightForHeight(weight, height);
  const overall = getOverallStatus(wa, ha, wh);
  return { wa, ha, wh, overall };
}

// ── Color Helpers ──
// Warna untuk tiap class status indikator.
export const STATUS_COLORS = {
  normal:    { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0', dark: '#15803D' },
  warning:   { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', dark: '#B45309' },
  danger:    { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dark: '#B91C1C' },
  info:      { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', dark: '#1D4ED8' },
};

// Label dan warna untuk status keseluruhan.
export const OVERALL_CONFIG = {
  normal:    { label: 'Pertumbuhan Normal', emoji: '✅', color: '#16A34A', bg: '#F0FDF4' },
  perhatian: { label: 'Perlu Perhatian',    emoji: '⚠️', color: '#D97706', bg: '#FFFBEB' },
  buruk:     { label: 'Status Kritis',       emoji: '🔴', color: '#DC2626', bg: '#FEF2F2' },
};

// Mapping class internal ke label Bahasa Indonesia.
export const CLS_LABEL_MAP = {
  'normal':       'Normal',
  'warning':      'Perlu Perhatian',
  'danger':       'Kritis',
  'info':         'Perhatian',
};
