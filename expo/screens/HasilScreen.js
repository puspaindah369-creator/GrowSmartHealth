// React dan hook dipakai untuk menjalankan efek serta menyimpan referensi animasi.
import React, { useEffect, useRef } from 'react';

// Komponen React Native untuk layout hasil, tombol, styling, animasi, dan pengecekan platform.
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';

// Konstanta tema dan konfigurasi status untuk warna, label, dan tampilan hasil gizi.
import { COLORS, FONTS, RADIUS, SHADOW, STATUS_CONFIG, OVERALL_CONFIG } from '../utils/theme';

// getRekomendasi menghasilkan rekomendasi berdasarkan status hasil deteksi.
import { getRekomendasi } from '../utils/predict';

// Wrapper gradient yang aman untuk web dan native.
function HeroGrad({ children, style }) {
  // Web memakai CSS gradient.
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
    // Fallback warna solid bila gradient tidak tersedia.
    return <View style={[{ backgroundColor: COLORS.primary }, style]}>{children}</View>;
  }
}

// Konfigurasi judul dan subtitle untuk tiap indikator.
const IND_CFG = {
  wa: { icon: 'BB/U', title: 'BB/U - Berat Badan / Umur', sub: 'Weight-for-Age' },
  ha: { icon: 'TB/U', title: 'TB/U - Tinggi Badan / Umur', sub: 'Height-for-Age' },
  wh: { icon: 'BB/TB', title: 'BB/TB - Berat Badan / Tinggi', sub: 'Weight-for-Height' },
};

// Mapping label dataset ke istilah WHO/Indonesia.
const WHO_LABEL_MAP = {
  wa: {
    Malnutrition: 'Berat badan sangat kurang (severely underweight)',
    Underfed: 'Berat badan kurang (underweight)',
    Normal: 'Normal',
    Overnutrition: 'Gizi lebih (overweight)',
  },
  ha: {
    Stunted: 'Stunted',
    'Not Stunted': 'Normal',
  },
  wh: {
    'Very Thin': 'Gizi buruk (severely wasted)',
    Thin: 'Gizi kurang (wasted)',
    Normal: 'Normal',
    Obese: 'Obese',
  },
};

// Menentukan label WHO/Indonesia berdasarkan label hasil dataset/model.
function getWhoLabel(indKey, ind) {
  return WHO_LABEL_MAP[indKey]?.[ind?.result] || ind?.result || '-';
}

// Kartu hasil untuk satu indikator: BB/U, TB/U, atau BB/TB.
function IndicatorCard({ indKey, ind, delay }) {
  // Ambil konfigurasi indikator dan warna status.
  const cfg = IND_CFG[indKey];
  const scfg = STATUS_CONFIG[ind.cls] || STATUS_CONFIG.normal;
  const whoLabel = getWhoLabel(indKey, ind);

  // Animasi masuk untuk kartu indikator.
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(20)).current;

  // Jalankan animasi setelah delay agar kartu muncul bertahap.
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, fadeIn, slideY]);

  // Render isi kartu indikator.
  return (
    <Animated.View
      style={[
        styles.indCard,
        {
          borderLeftColor: scfg.text,
          opacity: fadeIn,
          transform: [{ translateY: slideY }],
        },
      ]}
    >
      <View style={styles.indHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.indTitle}>{cfg.title}</Text>
          <Text style={styles.indSub}>{cfg.sub}</Text>
        </View>
        <Text style={styles.indIcon}>{cfg.icon}</Text>
      </View>

      <View style={[styles.statusChip, { backgroundColor: scfg.bg, borderColor: scfg.border }]}>
        <View style={[styles.chipDot, { backgroundColor: scfg.text }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.chipLabel}>Status</Text>
          <Text style={[styles.chipResult, { color: scfg.text }]}>{ind.result}</Text>
        </View>
      </View>

      <View style={styles.whoBox}>
        <Text style={styles.whoBoxTitle}>Mapping WHO</Text>
        <View style={styles.whoRow}>
          <Text style={styles.whoKey}>Label dataset</Text>
          <Text style={styles.whoValue}>{ind.result}</Text>
        </View>
        <View style={styles.whoRow}>
          <Text style={styles.whoKey}>Kategori WHO</Text>
          <Text style={[styles.whoValue, { color: scfg.text }]}>{whoLabel}</Text>
        </View>
      </View>

    </Animated.View>
  );
}

// Format tanggal menjadi format Indonesia yang mudah dibaca.
function formatTanggal(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Normalisasi kode gender dari backend menjadi label tampilan.
function formatGender(value) {
  if (value === 'M' || value === 'Laki-laki') return 'Laki-laki';
  if (value === 'F' || value === 'Perempuan') return 'Perempuan';
  return value || '-';
}

// Halaman detail hasil analisis dari form baru atau dari riwayat.
export default function HasilScreen({ navigation, route }) {
  // Data dikirim dari halaman Deteksi atau Riwayat lewat route params.
  const { data, readonly } = route.params;
  const { nama, usia, bb, tb, result } = data;

  // Ambil input backend sebagai fallback jika record lama tidak punya field langsung.
  const backendInput = result?.input || {};
  const genderDisplay = formatGender(data.gender || backendInput.gender);
  const tanggalLahirDisplay = formatTanggal(data.tanggalLahir || backendInput.date_of_birth);
  const tanggalPengukuranDisplay = formatTanggal(data.tanggalPengukuran || backendInput.date_of_measurement || data.date);

  // Ambil konfigurasi overall dan rekomendasi berdasarkan hasil.
  const ov = OVERALL_CONFIG[result.overall] || OVERALL_CONFIG.normal;
  const reks = getRekomendasi(result);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <HeroGrad style={styles.hero}>
          <View style={styles.heroTag}>
            <Text style={styles.heroTagText}>Hasil Analisis</Text>
          </View>

          <Text style={styles.heroName}>{nama}</Text>
          <Text style={styles.heroMeta}>Usia {usia} bulan - BB {bb} kg - TB {tb} cm</Text>
          <Text style={styles.heroMetaSub}>Gender {genderDisplay} - Tgl Lahir {tanggalLahirDisplay}</Text>
          <Text style={styles.heroMetaSub}>Date of Measurement {tanggalPengukuranDisplay}</Text>

          <View style={[styles.overallBadge, { backgroundColor: ov.bg, borderColor: ov.border }]}>
            <Text style={[styles.overallLabel, { color: ov.color }]}>{ov.label}</Text>
          </View>
        </HeroGrad>

        <View style={styles.indSection}>
          <Text style={styles.sectionTitle}>Hasil per Indikator</Text>
          <IndicatorCard indKey="wa" ind={result.wa} delay={100} />
          <IndicatorCard indKey="ha" ind={result.ha} delay={250} />
          <IndicatorCard indKey="wh" ind={result.wh} delay={400} />
        </View>

        <View style={styles.rekCard}>
          <Text style={styles.rekTitle}>Rekomendasi</Text>
          {reks.map((r, i) => (
            <View key={i} style={styles.rekItem}>
              <Text style={{ fontSize: 16 }}>{r.icon}</Text>
              <Text style={styles.rekText}>{r.text}</Text>
            </View>
          ))}
        </View>

        {!readonly ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Beranda')}
            >
              <Text style={styles.actionBtnText}>Ke Beranda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Deteksi')}
            >
              <Text style={styles.actionBtnText}>Cek Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
              activeOpacity={0.85}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.actionBtnText}>Kembali</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hero: { paddingTop: 56, paddingBottom: 36, paddingHorizontal: 20 },
  heroTag: {
    backgroundColor: 'rgba(255,255,255,.18)',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginBottom: 12,
  },
  heroTagText: { fontSize: 12, fontWeight: FONTS.semibold, color: '#fff' },
  heroName: { fontSize: 24, fontWeight: FONTS.black, color: '#fff' },
  heroMeta: { fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 4 },
  heroMetaSub: { fontSize: 12, color: 'rgba(255,255,255,.78)', marginTop: 4 },
  overallBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    marginTop: 16,
    borderWidth: 1,
  },
  overallLabel: { fontSize: 14, fontWeight: FONTS.bold },
  indSection: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: FONTS.bold, color: COLORS.text, marginBottom: 14 },
  indCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    ...SHADOW.md,
  },
  indHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  indTitle: { fontSize: 14, fontWeight: FONTS.bold, color: COLORS.text },
  indSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  indIcon: { fontSize: 14, fontWeight: FONTS.bold, color: COLORS.primary },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: RADIUS.sm,
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: FONTS.medium },
  chipResult: { fontSize: 15, fontWeight: FONTS.bold },
  whoBox: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: 14,
  },
  whoBoxTitle: { fontSize: 12, fontWeight: FONTS.bold, color: COLORS.text, marginBottom: 8 },
  whoRow: { flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'flex-start' },
  whoKey: { flex: 1, fontSize: 11, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  whoValue: { flex: 1.35, fontSize: 11, color: COLORS.text, fontWeight: FONTS.semibold },
  rekCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  rekTitle: { fontSize: 14, fontWeight: FONTS.bold, color: COLORS.primary, marginBottom: 12 },
  rekItem: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  rekText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  actionBtn: { flex: 1, borderRadius: RADIUS.sm, paddingVertical: 14, alignItems: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: FONTS.bold, color: '#fff' },
});
