// React dan hook dipakai untuk mengelola form, animasi, dan efek saat screen berjalan.
import React, { useState, useRef, useEffect } from 'react';

// Komponen React Native untuk layout form, input, tombol, animasi, loading, alert, dan platform.
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Animated, ActivityIndicator, Platform } from 'react-native';

// Konstanta tema aplikasi untuk warna, font, radius, dan bayangan.
import { COLORS, FONTS, RADIUS, SHADOW } from '../utils/theme';

// Fungsi predict mengirim data balita ke backend/model untuk mendapatkan hasil klasifikasi.
import { predict } from '../utils/api';

// addRecord menyimpan hasil pemeriksaan ke riwayat user.
import { addRecord } from '../utils/storage';

// Wrapper gradient yang menyesuaikan platform web dan native.
function HeroGrad({ children, style }) {
  // Web memakai CSS gradient langsung.
  if (Platform.OS === 'web') {
    return <View style={[{ background: 'linear-gradient(145deg, #BE185D, #EC4899)' }, style]}>{children}</View>;
  }

  try {
    // Native memakai expo-linear-gradient bila tersedia.
    const { LinearGradient } = require('expo-linear-gradient');
    return (
      <LinearGradient
        colors={['#BE185D', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={style}
      >
        {children}
      </LinearGradient>
    );
  } catch {
    // Fallback warna solid jika gradient gagal dimuat.
    return <View style={[{ backgroundColor: COLORS.primary }, style]}>{children}</View>;
  }
}

// Tombol submit dengan loading state dan tampilan berbeda untuk web/native.
function SubmitBtn({ loading, onPress }) {
  // Versi web memakai CSS gradient pada style.
  if (Platform.OS === 'web') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={loading}
        style={[
          styles.submitBtn,
          {
            background: loading ? '#94A3B8' : 'linear-gradient(135deg, #EC4899, #DB2777)',
            borderRadius: RADIUS.sm,
            overflow: 'hidden',
          },
        ]}
      >
        <View style={styles.submitBtnInner}>
          {loading ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={styles.submitText}>  Menganalisis...</Text>
            </>
          ) : (
            <Text style={styles.submitText}>Analisis Sekarang</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  try {
    // Versi native memakai LinearGradient.
    const { LinearGradient } = require('expo-linear-gradient');
    return (
      <TouchableOpacity onPress={onPress} disabled={loading} style={{ borderRadius: RADIUS.sm, overflow: 'hidden' }}>
        <LinearGradient
          colors={loading ? ['#94A3B8', '#94A3B8'] : [COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitBtnInner}
        >
          {loading ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={styles.submitText}>  Menganalisis...</Text>
            </>
          ) : (
            <Text style={styles.submitText}>Analisis Sekarang</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  } catch {
    // Fallback tombol biasa jika LinearGradient tidak tersedia.
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={loading}
        style={[styles.submitBtnInner, { backgroundColor: loading ? '#94A3B8' : COLORS.primary, borderRadius: RADIUS.sm }]}
      >
        <Text style={styles.submitText}>{loading ? 'Menganalisis...' : 'Analisis Sekarang'}</Text>
      </TouchableOpacity>
    );
  }
}

// Tabel kecil referensi WHO (-2 SD s.d. +2 SD) yang ditampilkan sesuai jenis kelamin.
const WHO_REF_BY_GENDER = {
  'Laki-laki': [
    { label: '6 bln', berat: '6.4-9.8 kg', tinggi: '63.3-71.9 cm' },
    { label: '12 bln', berat: '7.7-12.0 kg', tinggi: '71.0-80.5 cm' },
    { label: '24 bln', berat: '9.7-15.3 kg', tinggi: '81.7-93.9 cm' },
    { label: '36 bln', berat: '11.3-18.3 kg', tinggi: '88.7-103.5 cm' },
    { label: '48 bln', berat: '12.7-21.2 kg', tinggi: '94.9-111.7 cm' },
    { label: '59 bln', berat: '14.1-24.2 kg', tinggi: '101.2-118.2 cm' },
  ],
  Perempuan: [
    { label: '6 bln', berat: '5.7-9.3 kg', tinggi: '61.2-70.3 cm' },
    { label: '12 bln', berat: '7.0-11.5 kg', tinggi: '68.9-79.2 cm' },
    { label: '24 bln', berat: '9.0-14.8 kg', tinggi: '80.0-92.9 cm' },
    { label: '36 bln', berat: '10.8-18.1 kg', tinggi: '87.4-102.7 cm' },
    { label: '48 bln', berat: '12.3-21.5 kg', tinggi: '94.1-111.3 cm' },
    { label: '59 bln', berat: '13.7-24.9 kg', tinggi: '100.3-117.7 cm' },
  ],
};

// Halaman input data balita untuk menjalankan analisis status gizi.
export default function DeteksiScreen({ navigation }) {
  // State input identitas dan antropometri balita.
  const [nama, setNama] = useState('');
  const [gender, setGender] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [tanggalPengukuran, setTanggalPengukuran] = useState(formatDateInput(new Date()));
  const [usia, setUsia] = useState('');
  const [bb, setBb] = useState('');
  const [tb, setTb] = useState('');
  const [loading, setLoading] = useState(false);
  const whoRef = WHO_REF_BY_GENDER[gender] || WHO_REF_BY_GENDER['Laki-laki'];
  // Nilai animasi untuk efek shake saat validasi gagal.
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Menjalankan animasi geser kiri-kanan pada form.
  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  // Alert dibuat berbeda karena web tidak mendukung Alert native secara sama.
  function showAlert(title, msg) {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  }

  // Parsing tanggal input DD/MM/YYYY atau DD-MM-YYYY menjadi object Date.
  function parseTanggalLahir(value) {
    const clean = value.trim();
    const match = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }

  // Menghitung usia bulan dari tanggal lahir sampai tanggal pengukuran.
  function getAgeInMonths(date, measurementDate = new Date()) {
    let months = (measurementDate.getFullYear() - date.getFullYear()) * 12 + (measurementDate.getMonth() - date.getMonth());
    if (measurementDate.getDate() < date.getDate()) months -= 1;
    return months;
  }

  // Format Date menjadi DD/MM/YYYY untuk nilai default input.
  function formatDateInput(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Membersihkan input tanggal dan menambahkan slash otomatis.
  function formatTanggalInput(value) {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  // Saat tanggal lahir berubah, update input dan isi usia otomatis bila valid.
  function handleTanggalLahirChange(value) {
    const formatted = formatTanggalInput(value);
    setTanggalLahir(formatted);
    const parsed = parseTanggalLahir(formatted);
    const measurementDate = parseTanggalLahir(tanggalPengukuran) || new Date();
    if (!parsed) return;

    const ageMonths = getAgeInMonths(parsed, measurementDate);
    if (ageMonths >= 0 && ageMonths <= 59) setUsia(String(ageMonths));
  }

  // Saat tanggal pengukuran berubah, hitung ulang usia berdasarkan tanggal lahir.
  function handleTanggalPengukuranChange(value) {
    const formatted = formatTanggalInput(value);
    setTanggalPengukuran(formatted);
    const parsedMeasurement = parseTanggalLahir(formatted);
    const parsedBirth = parseTanggalLahir(tanggalLahir);
    if (!parsedMeasurement || !parsedBirth) return;

    const ageMonths = getAgeInMonths(parsedBirth, parsedMeasurement);
    if (ageMonths >= 0 && ageMonths <= 59) setUsia(String(ageMonths));
  }

  // Validasi form, kirim prediksi ke API, simpan riwayat, lalu buka halaman hasil.
  async function handleAnalysis() {
    // Parsing semua input yang dibutuhkan untuk validasi dan request.
    const tanggalLahirDate = parseTanggalLahir(tanggalLahir);
    const tanggalPengukuranDate = parseTanggalLahir(tanggalPengukuran);
    const usiaDariTanggalLahir = tanggalLahirDate && tanggalPengukuranDate ? getAgeInMonths(tanggalLahirDate, tanggalPengukuranDate) : NaN;
    const usiaNum = parseInt(usia, 10);
    const bbNum = parseFloat(bb);
    const tbNum = parseFloat(tb);

    // Validasi wajib isi dan rentang nilai sebelum request ke backend.
    if (!nama.trim()) { shake(); showAlert('Lengkapi Data', 'Nama balita wajib diisi.'); return; }
    if (!gender) { shake(); showAlert('Lengkapi Data', 'Jenis kelamin wajib dipilih.'); return; }
    if (!tanggalLahirDate) { shake(); showAlert('Tanggal Lahir Tidak Valid', 'Gunakan format DD/MM/YYYY, contoh: 17/08/2022.'); return; }
    if (!tanggalPengukuranDate) { shake(); showAlert('Tanggal Pengukuran Tidak Valid', 'Gunakan format DD/MM/YYYY, contoh: 05/05/2026.'); return; }
    if (tanggalPengukuranDate < tanggalLahirDate) { shake(); showAlert('Tanggal Pengukuran Tidak Valid', 'Tanggal pengukuran tidak boleh lebih awal dari tanggal lahir.'); return; }
    if (usiaDariTanggalLahir < 0 || usiaDariTanggalLahir > 59) { shake(); showAlert('Tanggal Lahir Tidak Valid', 'Tanggal lahir harus menghasilkan usia 0-59 bulan.'); return; }
    if (!usia || Number.isNaN(usiaNum) || usiaNum < 0 || usiaNum > 59) { shake(); showAlert('Usia Tidak Valid', 'Usia harus antara 0-59 bulan.'); return; }
    if (!bb || Number.isNaN(bbNum) || bbNum < 1 || bbNum > 50) { shake(); showAlert('Berat Tidak Valid', 'Berat badan harus antara 1-50 kg.'); return; }
    if (!tb || Number.isNaN(tbNum) || tbNum < 30 || tbNum > 130) { shake(); showAlert('Tinggi Tidak Valid', 'Tinggi badan harus antara 30-130 cm.'); return; }

    // Tampilkan loading singkat agar proses analisis terasa jelas di UI.
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    const result = await predict(usiaNum, bbNum, tbNum, gender, tanggalLahir, tanggalPengukuran);

    // Susun record lengkap untuk dikirim ke halaman hasil dan disimpan di riwayat.
    const record = {
      nama: nama.trim(),
      gender,
      tanggalLahir: tanggalLahirDate.toISOString(),
      tanggalPengukuran: tanggalPengukuranDate.toISOString(),
      usia: usiaNum,
      bb: bbNum,
      tb: tbNum,
      result,
      date: new Date().toISOString(),
    };

    // Simpan riwayat, matikan loading, lalu navigasi ke hasil.
    await addRecord(record);
    setLoading(false);
    navigation.navigate('Hasil', { data: record, readonly: false });

    // Reset form setelah analisis selesai.
    setNama('');
    setGender('');
    setTanggalLahir('');
    setTanggalPengukuran(formatDateInput(new Date()));
    setUsia('');
    setBb('');
    setTb('');
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <HeroGrad style={styles.hero}>
          <Text style={styles.heroTitle}>Input Data Balita</Text>
          <Text style={styles.heroSub}>Masukkan data antropometri untuk analisis status pertumbuhan</Text>

        </HeroGrad>

        <Animated.View style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nama Balita <Text style={{ color: COLORS.danger }}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Andi Putra"
              placeholderTextColor={COLORS.textMuted}
              value={nama}
              onChangeText={setNama}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Jenis Kelamin <Text style={{ color: COLORS.danger }}>*</Text></Text>
            <View style={styles.genderRow}>
              {[
                { key: 'Laki-laki', label: 'Laki-laki' },
                { key: 'Perempuan', label: 'Perempuan' },
              ].map((item) => {
                const active = gender === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.genderBtn, active && styles.genderBtnActive]}
                    activeOpacity={0.85}
                    onPress={() => setGender(item.key)}
                  >
                    <Text style={[styles.genderBtnText, active && styles.genderBtnTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Tanggal Lahir <Text style={{ color: COLORS.danger }}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={COLORS.textMuted}
              value={tanggalLahir}
              onChangeText={handleTanggalLahirChange}
              keyboardType="numeric"
              maxLength={10}
            />
            <Text style={styles.fieldHint}>Contoh: 17/08/2022, usia bulan akan terisi otomatis</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Date of Measurement <Text style={{ color: COLORS.danger }}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={COLORS.textMuted}
              value={tanggalPengukuran}
              onChangeText={handleTanggalPengukuranChange}
              keyboardType="numeric"
              maxLength={10}
            />
            <Text style={styles.fieldHint}>Tanggal anak diukur/dicek, sesuai kolom dataset</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Usia (bulan) <Text style={{ color: COLORS.danger }}>*</Text></Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="0 - 59"
                placeholderTextColor={COLORS.textMuted}
                value={usia}
                onChangeText={setUsia}
                keyboardType="numeric"
                maxLength={2}
              />
              {usia !== '' && Number(usia) >= 0 && Number(usia) <= 59 && (
                <View style={styles.usiaTag}>
                  <Text style={styles.usiaTagText}>{Math.floor(Number(usia) / 12)} thn {Number(usia) % 12} bln</Text>
                </View>
              )}
            </View>
            <Text style={styles.fieldHint}>Rentang 0-59 bulan (balita 0-5 tahun)</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Berat Badan (kg) <Text style={{ color: COLORS.danger }}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 11.5"
              placeholderTextColor={COLORS.textMuted}
              value={bb}
              onChangeText={setBb}
              keyboardType="decimal-pad"
            />
            <Text style={styles.fieldHint}>Dalam satuan kilogram (kg)</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Tinggi Badan (cm) <Text style={{ color: COLORS.danger }}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 85.0"
              placeholderTextColor={COLORS.textMuted}
              value={tb}
              onChangeText={setTb}
              keyboardType="decimal-pad"
            />
            <Text style={styles.fieldHint}>Dalam satuan sentimeter (cm)</Text>
          </View>

          <SubmitBtn loading={loading} onPress={handleAnalysis} />
        </Animated.View>

        <View style={styles.whoCard}>
          <Text style={styles.whoTitle}>Referensi Standar WHO</Text>
          <View style={styles.whoHeader}>
            <Text style={[styles.whoCell, { flex: 1.2, fontWeight: FONTS.bold, color: COLORS.textSecondary }]}>Usia</Text>
            <Text style={[styles.whoCell, { flex: 1.4, fontWeight: FONTS.bold, color: COLORS.textSecondary }]}>Berat Normal</Text>
            <Text style={[styles.whoCell, { flex: 1.6, fontWeight: FONTS.bold, color: COLORS.textSecondary }]}>Tinggi Normal</Text>
          </View>
          {whoRef.map((r, i) => (
            <View key={i} style={[styles.whoRow, i % 2 === 0 && { backgroundColor: COLORS.primaryLight }]}>
              <Text style={[styles.whoCell, { flex: 1.2, fontWeight: FONTS.semibold, color: COLORS.primary }]}>{r.label}</Text>
              <Text style={[styles.whoCell, { flex: 1.4 }]}>{r.berat}</Text>
              <Text style={[styles.whoCell, { flex: 1.6 }]}>{r.tinggi}</Text>
            </View>
          ))}
          <Text style={styles.whoNote}>* Rentang normal -2 SD s.d. +2 SD mengikuti standar pertumbuhan WHO 2006 dan berbeda untuk laki-laki/perempuan.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hero: { paddingTop: 56, paddingBottom: 36, paddingHorizontal: 20 },
  heroTitle: { fontSize: 22, fontWeight: FONTS.black, color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,.75)', marginTop: 6, lineHeight: 20 },
  modelBadge: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,.15)',
    borderRadius: RADIUS.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.2)',
  },
  modelBadgeText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,.85)', lineHeight: 18 },
  modelModeText: { marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,.9)', fontWeight: FONTS.semibold },
  formCard: { margin: 16, backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 20, ...SHADOW.md },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: FONTS.semibold, color: COLORS.text, marginBottom: 8 },
  fieldHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 5 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  genderBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  genderBtnText: { fontSize: 14, fontWeight: FONTS.semibold, color: COLORS.textSecondary },
  genderBtnTextActive: { color: COLORS.primary },
  usiaTag: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 8, borderRadius: RADIUS.sm },
  usiaTagText: { fontSize: 12, fontWeight: FONTS.bold, color: COLORS.primary },
  submitBtn: { width: '100%' },
  submitBtnInner: { paddingVertical: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  submitText: { fontSize: 16, fontWeight: FONTS.bold, color: '#fff' },
  whoCard: { marginHorizontal: 16, marginTop: 4, backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 16, ...SHADOW.sm },
  whoTitle: { fontSize: 14, fontWeight: FONTS.bold, color: COLORS.primary, marginBottom: 12 },
  whoHeader: { flexDirection: 'row', borderBottomWidth: 1.5, borderColor: COLORS.border, paddingBottom: 8, marginBottom: 4 },
  whoRow: { flexDirection: 'row', paddingVertical: 8, borderRadius: 6, paddingHorizontal: 4 },
  whoCell: { fontSize: 11, color: COLORS.text },
  whoNote: { fontSize: 10, color: COLORS.textMuted, marginTop: 10, fontStyle: 'italic' },
});
