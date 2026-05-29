// React digunakan untuk membuat komponen halaman About.
import React from 'react';

// Komponen React Native untuk membangun layout, teks, scroll, styling, tombol, platform, dan dialog alert.
import { View, Text, ScrollView, StyleSheet, Platform, TouchableOpacity, Alert } from 'react-native';

// Konstanta tema aplikasi untuk warna, font, radius sudut, dan bayangan agar tampilan konsisten.
import { COLORS, FONTS, RADIUS, SHADOW } from '../utils/theme';

// Informasi profil aplikasi yang ditampilkan sebagai tabel.
const APP_INFO = [
  { label: 'Nama Aplikasi', value: 'GrowSmart Health' },
  { label: 'Dirancang Oleh', value: 'Puspa Indah' },
  { label: 'NIM', value: '535220035' },
  { label: 'Institusi', value: 'Universitas Tarumanagara' },
  { label: 'Tahun', value: '2026' },
  { label: 'Dosen Pembimbing', value: ['Tenny Handhayani, S.Kom., M.Kom.', 'Dr. Meirista Wulandari, S.T., M.Eng.'] },
];

// Informasi metode/model untuk tiap indikator antropometri.
const METHOD_DATA = [
  {
    title: 'BB/U',
    sub: 'Berat Badan menurut Umur',
    model: 'LightGBM',
    desc: 'Klasifikasi status berat badan anak terhadap usia untuk mendeteksi normal, underfed, malnutrition, dan overnutrition.',
    color: COLORS.primary,
    bg: COLORS.primaryLight,
  },
  {
    title: 'TB/U',
    sub: 'Tinggi Badan menurut Umur',
    model: 'LightGBM',
    desc: 'Klasifikasi indikator stunting dengan target Not Stunted dan Stunted berdasarkan tinggi badan terhadap usia.',
    color: COLORS.success,
    bg: COLORS.successLight,
  },
  {
    title: 'BB/TB',
    sub: 'Berat Badan menurut Tinggi',
    model: 'LightGBM',
    desc: 'Klasifikasi proporsi berat badan terhadap tinggi badan untuk mendeteksi normal, thin, very thin, dan obese.',
    color: COLORS.warning,
    bg: COLORS.warningLight,
  },
];

// Informasi dataset dan skema pelatihan yang ditampilkan di halaman About.
const DATASET_INFO = [
  { label: 'Dataset', value: 'Stunting and Nutritional Status of Toddler from Jeneponto Regency, South Sulawesi' },
  { label: 'Sumber', value: 'Mendeley Data' },
  { label: 'Total data', value: '14.326 baris setelah preprocessing' },
  { label: 'Fitur masukan', value: 'Jenis kelamin, tanggal lahir, usia, berat badan, dan tinggi badan' },
  { label: 'Target variabel', value: 'BB/U, TB/U, dan BB/TB' },
  { label: 'Validasi', value: 'Train 80% / Test 20%' },
];

// Wrapper gradient yang aman untuk web dan native.
function HeroGrad({ children, style }) {
  // Web menggunakan CSS gradient langsung.
  if (Platform.OS === 'web') {
    return <View style={[{ background: 'linear-gradient(145deg, #BE185D, #EC4899)' }, style]}>{children}</View>;
  }

  try {
    // Native memakai expo-linear-gradient bila tersedia.
    const { LinearGradient } = require('expo-linear-gradient');
    return (
      <LinearGradient
        colors={[COLORS.primaryDeep, COLORS.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={style}
      >
        {children}
      </LinearGradient>
    );
  } catch {
    // Fallback jika package gradient tidak tersedia.
    return <View style={[{ backgroundColor: COLORS.primary }, style]}>{children}</View>;
  }
}

// Komponen pembungkus section agar layout halaman konsisten.
function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// Halaman informasi aplikasi, metode, dataset, dan tombol logout.
export default function AboutScreen({ onLogout }) {
  // Menampilkan konfirmasi sebelum logout.
  function handleLogoutPress() {
    // Web memakai window.confirm.
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Keluar dari aplikasi?');
      if (confirmed) onLogout?.();
      return;
    }

    // Native memakai Alert bawaan React Native.
    Alert.alert('Logout', 'Keluar dari aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => onLogout?.() },
    ]);
  }

  // Render seluruh konten About dalam ScrollView.
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <HeroGrad style={styles.hero}>
          <Text style={styles.heroKicker}>Tentang Aplikasi</Text>
          <Text style={styles.heroTitle}>GrowSmart Health</Text>
          <Text style={styles.heroSub}>
            Aplikasi skrining status gizi balita berbasis machine learning untuk membantu pemantauan pertumbuhan secara praktis.
          </Text>
        </HeroGrad>

        <Section title="Profil Aplikasi">
          <Text style={styles.paragraph}>
            GrowSmart Health dibuat sebagai alat bantu deteksi dini status gizi balita. Aplikasi ini menerima data usia, berat badan, dan tinggi badan, lalu menampilkan hasil analisis untuk tiga indikator antropometri: BB/U, TB/U, dan BB/TB.
          </Text>
          <View style={styles.infoTable}>
            {APP_INFO.map((item) => (
              <View key={item.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                {Array.isArray(item.value) ? (
                  <View style={styles.infoValueList}>
                    {item.value.map((name) => (
                      <Text key={name} style={styles.infoValue}>{name}</Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.infoValue}>{item.value}</Text>
                )}
              </View>
            ))}
          </View>
        </Section>

        <Section title="Pembuatan Aplikasi">
          <Text style={styles.paragraph}>
            Aplikasi dikembangkan menggunakan React Native dan Expo untuk tampilan mobile, Python Flask untuk backend, serta MySQL untuk menyimpan akun pengguna dan riwayat pemeriksaan masing-masing pengguna.
          </Text>
          <View style={styles.processGrid}>
            {[
              ['Input Data', 'Nama, jenis kelamin, tanggal lahir, usia, berat badan, dan tinggi badan balita.'],
              ['Analisis', 'Data antropometri diproses untuk menghasilkan status pertumbuhan berdasarkan indikator gizi.'],
              ['Hasil', 'Aplikasi menampilkan status per indikator, ringkasan kondisi, dan rekomendasi.'],
            ].map(([title, text]) => (
              <View key={title} style={styles.processItem}>
                <Text style={styles.processTitle}>{title}</Text>
                <Text style={styles.processText}>{text}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Metode Yang Dipakai">
          <Text style={styles.paragraph}>
            Metode yang digunakan adalah klasifikasi machine learning dengan standar antropometri WHO 2006 sebagai dasar interpretasi status pertumbuhan. Model dilatih menggunakan dataset Stunting and Nutritional Status of Toddler from Jeneponto Regency, South Sulawesi dari Mendeley Data.
          </Text>
          {METHOD_DATA.map((item) => (
            <View key={item.title} style={[styles.methodCard, { borderLeftColor: item.color }]}>
              <View style={[styles.methodBadge, { backgroundColor: item.bg }]}>
                <Text style={[styles.methodBadgeText, { color: item.color }]}>{item.model}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodTitle}>{item.title} - {item.sub}</Text>
                <Text style={styles.methodDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
          <View style={styles.datasetBox}>
            <Text style={styles.datasetTitle}>Detail Dataset dan Pelatihan</Text>
            {DATASET_INFO.map((item) => (
              <View key={item.label} style={styles.datasetRow}>
                <Text style={styles.datasetLabel}>{item.label}</Text>
                <Text style={styles.datasetValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Catatan">
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              GrowSmart Health merupakan alat bantu skrining dan bukan pengganti diagnosis medis. Hasil pemeriksaan tetap perlu dikonsultasikan kepada tenaga kesehatan profesional.
            </Text>
          </View>
        </Section>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutPress} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingBottom: 28 },
  hero: {
    paddingTop: 56,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  heroKicker: {
    fontSize: 12,
    fontWeight: FONTS.bold,
    color: 'rgba(255,255,255,.78)',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: FONTS.black,
    color: '#fff',
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,.82)',
    lineHeight: 20,
    marginTop: 8,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: 16,
    ...SHADOW.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: FONTS.bold,
    color: COLORS.text,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  infoTable: {
    marginTop: 14,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  infoLabel: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
  },
  infoValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: FONTS.semibold,
    textAlign: 'right',
    lineHeight: 18,
  },
  infoValueList: {
    flex: 1.2,
    gap: 4,
    alignItems: 'flex-end',
  },
  processGrid: {
    gap: 10,
    marginTop: 14,
  },
  processItem: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  processTitle: {
    fontSize: 13,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
    marginBottom: 4,
  },
  processText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  methodCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    padding: 12,
    marginTop: 10,
  },
  methodBadge: {
    minWidth: 74,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  methodBadgeText: {
    fontSize: 11,
    fontWeight: FONTS.black,
  },
  methodTitle: {
    fontSize: 13,
    fontWeight: FONTS.bold,
    color: COLORS.text,
  },
  methodDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  datasetBox: {
    marginTop: 14,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  datasetTitle: {
    fontSize: 13,
    fontWeight: FONTS.bold,
    color: COLORS.text,
    marginBottom: 8,
  },
  datasetRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  datasetLabel: {
    flex: 0.9,
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
  },
  datasetValue: {
    flex: 1.4,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.text,
    fontWeight: FONTS.semibold,
    textAlign: 'right',
  },
  noteBox: {
    backgroundColor: COLORS.warningLight,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    borderRadius: RADIUS.sm,
    padding: 12,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.warning,
    fontWeight: FONTS.medium,
  },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: FONTS.bold,
    color: '#fff',
  },
});
