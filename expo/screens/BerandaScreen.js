// React dan hook dipakai untuk membuat halaman serta menyimpan/memuat statistik ringkas.
import React, { useState, useCallback } from 'react';

// Komponen React Native untuk layout, teks, scroll, tombol, styling, dan pengecekan platform.
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';

// useFocusEffect menjalankan ulang pemuatan data saat tab Beranda kembali dibuka.
import { useFocusEffect } from '@react-navigation/native';

// Konstanta tema aplikasi agar warna, font, radius, dan bayangan konsisten.
import { COLORS, FONTS, RADIUS, SHADOW } from '../utils/theme';

// loadHistory mengambil riwayat pemeriksaan untuk dihitung menjadi statistik beranda.
import { loadHistory } from '../utils/storage';

// Web-safe gradient wrapper
// Wrapper gradient yang dapat berjalan di web maupun native.
function HeroGrad({ children, style }) {
  // Web memakai CSS gradient.
  if (Platform.OS === 'web') {
    return (
      <View style={[{ background: 'linear-gradient(145deg, #BE185D 0%, #EC4899 60%, #F472B6 100%)' }, style]}>
        {children}
      </View>
    );
  }
  try {
    // Native memakai expo-linear-gradient bila tersedia.
    const { LinearGradient } = require('expo-linear-gradient');
    return (
      <LinearGradient
        colors={['#BE185D', '#EC4899', '#F472B6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={style}
      >
        {children}
      </LinearGradient>
    );
  } catch {
    // Fallback warna solid bila gradient tidak bisa dimuat.
    return <View style={[{ backgroundColor: COLORS.primary }, style]}>{children}</View>;
  }
}

const OV_COLOR = { normal: COLORS.success, perhatian: COLORS.warning, buruk: COLORS.danger };
const OV_EMOJI = { normal: '✅', perhatian: '⚠️', buruk: '🔴' };
const OV_LABEL = { normal: 'Normal', perhatian: 'Perlu Perhatian', buruk: 'Kritis' };

// Menu cepat yang mengarah ke screen utama aplikasi.
const QUICK_MENUS = [
  { icon: '🔬', title: 'Deteksi Gizi',  desc: 'Analisis status pertumbuhan balita',  color: COLORS.primaryLight, screen: 'Deteksi' },
  { icon: '📋', title: 'Riwayat',        desc: 'Lihat hasil pemeriksaan sebelumnya', color: COLORS.successLight, screen: 'Riwayat' },
  { icon: '📖', title: 'Panduan Gizi',   desc: 'Standar WHO & interpretasi hasil',   color: COLORS.warningLight, screen: 'Panduan' },
  { icon: 'ℹ️', title: 'About',          desc: 'Tentang aplikasi dan penelitian',     color: COLORS.purpleLight,  screen: 'About' },
];

// Format tanggal pemeriksaan agar tampil ringkas di kartu riwayat terbaru.
function formatTanggalCek(record) {
  const d = new Date(record.tanggalPengukuran || record.result?.input?.date_of_measurement || record.date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Halaman beranda yang menampilkan sapaan, statistik, menu cepat, dan riwayat terbaru.
export default function BerandaScreen({ navigation, authUser }) {
  // Menyimpan riwayat yang diambil dari backend/storage.
  const [history, setHistory] = useState([]);
  // Nama yang tampil di hero, fallback ke username atau teks umum.
  const displayName = authUser?.name || authUser?.username || 'Pengguna';

  // Setiap screen fokus, muat ulang riwayat agar data terbaru muncul.
  useFocusEffect(useCallback(() => {
    loadHistory().then(setHistory);
  }, []));

  // Hitung statistik ringkas untuk kartu di beranda.
  const total   = history.length;
  const normals = history.filter(h => h.result.overall === 'normal').length;
  const perlu   = total - normals;
  // Ambil tiga pemeriksaan terbaru saja untuk ringkasan beranda.
  const recent  = history.slice(0, 3);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        <HeroGrad style={styles.hero}>
          <Text style={styles.heroGreet}>Selamat datang 👋</Text>
          <Text style={styles.heroUserName}>{displayName}</Text>
          <Text style={styles.heroTitle}>GrowSmart{'\n'}Health</Text>
          <Text style={styles.heroSub}>Pantau tumbuh kembang balita dengan AI</Text>
          <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.navigate('Deteksi')} activeOpacity={0.85}>
            <Text style={styles.heroBtnText}>🔬  Mulai Pemeriksaan</Text>
          </TouchableOpacity>
        </HeroGrad>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { num: total,   lbl: 'Total Cek',       color: COLORS.primary },
            { num: normals, lbl: 'Normal',            color: COLORS.success },
            { num: perlu,   lbl: 'Perlu Perhatian',  color: COLORS.warning },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
              <Text style={styles.statLbl}>{s.lbl}</Text>
            </View>
          ))}
        </View>

        {/* Quick Menu */}
        <Text style={styles.sectionTitle}>Menu Cepat</Text>
        <View style={styles.quickGrid}>
          {QUICK_MENUS.map((m, i) => (
            <TouchableOpacity key={i} style={styles.quickCard} onPress={() => navigation.navigate(m.screen)} activeOpacity={0.8}>
              <View style={[styles.quickIcon, { backgroundColor: m.color }]}>
                <Text style={{ fontSize: 22 }}>{m.icon}</Text>
              </View>
              <Text style={styles.quickTitle}>{m.title}</Text>
              <Text style={styles.quickDesc}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent */}
        <Text style={styles.sectionTitle}>Pemeriksaan Terbaru</Text>
        <View style={{ paddingHorizontal: 16 }}>
          {recent.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 44, marginBottom: 8 }}>📊</Text>
              <Text style={styles.emptyTitle}>Belum ada pemeriksaan</Text>
              <Text style={styles.emptyDesc}>Mulai cek pertama untuk memantau{'\n'}tumbuh kembang balita</Text>
            </View>
          ) : recent.map((h, i) => {
            const ov = h.result.overall;
            const ds = formatTanggalCek(h);
            return (
              <TouchableOpacity key={i} style={styles.recentCard} activeOpacity={0.8}
                onPress={() => navigation.navigate('Hasil', { data: h, readonly: true })}>
                <View style={[styles.recentAvatar, { backgroundColor: OV_COLOR[ov] + '20' }]}>
                  <Text style={{ fontSize: 22 }}>{OV_EMOJI[ov]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentName}>{h.nama}</Text>
                  <Text style={styles.recentMeta}>{h.usia} bln · {h.bb} kg · {h.tb} cm · {ds}</Text>
                </View>
                <View style={[styles.recentBadge, { backgroundColor: OV_COLOR[ov] + '20' }]}>
                  <Text style={[styles.recentBadgeText, { color: OV_COLOR[ov] }]}>{OV_LABEL[ov]}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },
  hero:         { paddingTop: 56, paddingBottom: 48, paddingHorizontal: 20 },
  heroGreet:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: FONTS.medium },
  heroUserName: { fontSize: 18, color: '#fff', fontWeight: FONTS.bold, marginTop: 2 },
  heroTitle:    { fontSize: 32, fontWeight: FONTS.black, color: '#fff', marginTop: 4, lineHeight: 40 },
  heroSub:      { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  heroBtn:      { marginTop: 22, alignSelf: 'flex-start', backgroundColor: '#fff',
                  paddingHorizontal: 22, paddingVertical: 13, borderRadius: RADIUS.full, ...SHADOW.md },
  heroBtnText:  { fontSize: 14, fontWeight: FONTS.bold, color: COLORS.primary },
  statsRow:     { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: -22, zIndex: 2 },
  statCard:     { flex: 1, backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 14, alignItems: 'center', ...SHADOW.md },
  statNum:      { fontSize: 24, fontWeight: FONTS.black },
  statLbl:      { fontSize: 10, color: COLORS.textSecondary, fontWeight: FONTS.medium, marginTop: 3, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: FONTS.bold, color: COLORS.text, paddingHorizontal: 16, marginTop: 22, marginBottom: 12 },
  quickGrid:    { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  quickCard:    { width: '47%', backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 16, ...SHADOW.sm },
  quickIcon:    { width: 44, height: 44, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  quickTitle:   { fontSize: 14, fontWeight: FONTS.bold, color: COLORS.text },
  quickDesc:    { fontSize: 11, color: COLORS.textSecondary, marginTop: 3, lineHeight: 15 },
  recentCard:   { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 14, flexDirection: 'row',
                  alignItems: 'center', gap: 12, marginBottom: 10, ...SHADOW.sm },
  recentAvatar: { width: 44, height: 44, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  recentName:   { fontSize: 14, fontWeight: FONTS.semibold, color: COLORS.text },
  recentMeta:   { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },
  recentBadge:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  recentBadgeText: { fontSize: 10, fontWeight: FONTS.bold },
  emptyBox:     { alignItems: 'center', paddingVertical: 40 },
  emptyTitle:   { fontSize: 15, fontWeight: FONTS.bold, color: COLORS.text },
  emptyDesc:    { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
