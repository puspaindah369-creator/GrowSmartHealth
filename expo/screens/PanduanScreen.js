// React dan useState dipakai untuk membuat halaman panduan dengan tab/section aktif.
import React, { useState } from 'react';

// Komponen React Native untuk layout panduan, teks, scroll, tombol, dan styling.
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

// Konstanta tema aplikasi untuk warna, font, radius, dan bayangan.
import { COLORS, FONTS, RADIUS, SHADOW } from '../utils/theme';

// Data panduan WHO untuk tiga indikator gizi yang ditampilkan sebagai kartu.
const PANDUAN_DATA = [
  {
    icon: 'BB/U',
    title: 'BB/U - Berat Badan menurut Umur',
    sub: 'Weight-for-Age',
    iconBg: COLORS.primaryLight,
    desc: 'Indikator WHO untuk menilai berat badan anak menurut umur. Indikator ini memetakan berat badan sangat kurang, berat badan kurang, normal, dan gizi lebih.',
    categories: [
      { name: 'Berat badan sangat kurang (severely underweight)', cutoff: 'Z-score < -3 SD', cls: 'danger', status: 'Penanganan serius' },
      { name: 'Berat badan kurang (underweight)', cutoff: '-3 SD s.d. < -2 SD', cls: 'warning', status: 'Perhatian' },
      { name: 'Normal', cutoff: '-2 SD s.d. +2 SD', cls: 'normal', status: 'Baik' },
      { name: 'Gizi lebih (overweight)', cutoff: '> +2 SD', cls: 'info', status: 'Perhatian' },
    ],
    mapping: [
      'Malnutrition -> Berat badan sangat kurang (severely underweight)',
      'Underfed -> Berat badan kurang (underweight)',
      'Overnutrition -> Gizi lebih (overweight)',
    ],
    tip: 'Berat badan sangat kurang dan berat badan kurang perlu evaluasi asupan makan, penyakit penyerta, dan pemantauan pertumbuhan berkala.',
    tipColor: COLORS.warningLight,
    tipText: COLORS.warning,
  },
  {
    icon: 'TB/U',
    title: 'TB/U - Tinggi Badan menurut Umur',
    sub: 'Height-for-Age',
    iconBg: COLORS.successLight,
    desc: 'Indikator WHO utama untuk stunting atau gangguan pertumbuhan linear kronis. Indikator ini menilai tinggi badan anak dibandingkan umur.',
    categories: [
      { name: 'Sangat pendek (severely stunted)', cutoff: 'Z-score < -3 SD', cls: 'danger', status: 'Penanganan serius' },
      { name: 'Pendek (stunted)', cutoff: '-3 SD s.d. < -2 SD', cls: 'warning', status: 'Perhatian' },
      { name: 'Normal', cutoff: '-2 SD s.d. +3 SD', cls: 'normal', status: 'Baik' },
      { name: 'Tinggi', cutoff: '> +3 SD', cls: 'info', status: 'Perhatian' },
    ],
    mapping: [
      'Stunted -> Sangat pendek/Pendek',
      'Not Stunted -> Normal',
    ],
    tip: 'Intervensi paling efektif dilakukan sejak 1000 HPK (hari pertama kehidupan).',
    tipColor: COLORS.dangerLight,
    tipText: COLORS.danger,
  },
  {
    icon: 'BB/TB',
    title: 'BB/TB - Berat Badan menurut Tinggi',
    sub: 'Weight-for-Height',
    iconBg: COLORS.orangeLight,
    desc: 'Indikator WHO untuk wasting atau kekurangan gizi akut, serta gizi lebih dan obesitas berdasarkan proporsi berat badan terhadap tinggi badan.',
    categories: [
      { name: 'Gizi buruk (severely wasted)', cutoff: 'Z-score < -3 SD', cls: 'danger', status: 'Penanganan serius' },
      { name: 'Gizi kurang (wasted)', cutoff: '-3 SD s.d. < -2 SD', cls: 'warning', status: 'Perhatian' },
      { name: 'Normal', cutoff: '-2 SD s.d. +2 SD', cls: 'normal', status: 'Baik' },
      { name: 'Gizi lebih (overweight)', cutoff: '> +2 SD s.d. +3 SD', cls: 'info', status: 'Perhatian' },
      { name: 'Obesitas (obese)', cutoff: '> +3 SD', cls: 'danger', status: 'Penanganan serius' },
    ],
    mapping: [
      'Very Thin -> Gizi buruk (severely wasted)',
      'Thin -> Gizi kurang (wasted)',
      'Obese -> Gizi lebih/Obesitas',
    ],
    tip: 'Gizi buruk (severely wasted) adalah kondisi gizi darurat dan perlu evaluasi klinis segera.',
    tipColor: COLORS.dangerLight,
    tipText: COLORS.danger,
  },
];

// Warna badge berdasarkan class status kategori.
const CLS_COLORS = {
  normal: { bg: COLORS.successLight, text: COLORS.success },
  warning: { bg: COLORS.warningLight, text: COLORS.warning },
  danger: { bg: COLORS.dangerLight, text: COLORS.danger },
  info: { bg: COLORS.primaryLight, text: COLORS.primary },
};

// Kartu panduan untuk satu indikator, bisa dibuka/tutup detailnya.
function PanduanCard({ item }) {
  // State untuk menampilkan atau menyembunyikan detail kategori.
  const [expanded, setExpanded] = useState(item.icon === 'BB/U');

  // Render ringkasan indikator dan detail jika expanded bernilai true.
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: item.iconBg }]}>
          <Text style={styles.iconLabel}>{item.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSub}>{item.sub}</Text>
        </View>
      </View>
      <Text style={styles.cardDesc}>{item.desc}</Text>

      {expanded && (
        <>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.headCat]}>Kategori WHO</Text>
            <Text style={[styles.tableCell, styles.headCutoff]}>Cut-off Z-Score</Text>
            <Text style={[styles.tableCell, styles.headStatus]}>Status</Text>
          </View>

          {item.categories.map((cat, i) => {
            const cc = CLS_COLORS[cat.cls];
            return (
              <View key={i} style={[styles.tableRow, i % 2 === 0 && { backgroundColor: COLORS.bg }]}>
                <View style={[styles.catBadge, { backgroundColor: cc.bg }]}>
                  <Text style={[styles.catBadgeText, { color: cc.text }]}>{cat.name}</Text>
                </View>
                <Text style={[styles.tableCell, styles.headCutoff]}>{cat.cutoff}</Text>
                <Text style={[styles.tableCell, styles.headStatus]}>{cat.status}</Text>
              </View>
            );
          })}

          <View style={styles.mappingBox}>
            <Text style={styles.mappingTitle}>Mapping label dataset ke WHO:</Text>
            {item.mapping.map((m, idx) => (
              <Text key={idx} style={styles.mappingText}>- {m}</Text>
            ))}
          </View>

          <View style={[styles.tipBox, { backgroundColor: item.tipColor }]}>
            <Text style={[styles.tipText, { color: item.tipText }]}>{item.tip}</Text>
          </View>
        </>
      )}

      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.expandBtn} activeOpacity={0.7}>
        <Text style={styles.expandText}>{expanded ? 'Tutup Detail' : 'Lihat Detail'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Halaman panduan gizi berdasarkan standar WHO.
export default function PanduanScreen() {
  // Render semua kartu panduan dan disclaimer.
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerTitle}>Panduan WHO untuk Interpretasi Hasil</Text>
          <Text style={styles.infoBannerSub}>
            Panduan ini mengikuti standar WHO Child Growth Standards (0-59 bulan). Istilah dataset dipetakan ke kategori gizi Indonesia dan istilah WHO.
          </Text>
        </View>

        {PANDUAN_DATA.map((item, i) => (
          <PanduanCard key={i} item={item} />
        ))}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Aplikasi ini adalah alat bantu skrining, bukan pengganti diagnosis klinis. Konfirmasi hasil tetap perlu dilakukan oleh tenaga kesehatan.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  infoBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 18,
  },
  infoBannerTitle: {
    fontSize: 18,
    fontWeight: FONTS.black,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
  },
  infoBannerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,.85)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    ...SHADOW.md,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconLabel: {
    fontSize: 15,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: FONTS.bold,
    color: COLORS.text,
    flexWrap: 'wrap',
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  cardDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderColor: COLORS.border,
    paddingBottom: 8,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderRadius: 6,
  },
  tableCell: {
    fontSize: 11,
    color: COLORS.text,
  },
  headCat: { flex: 2.15, fontWeight: FONTS.bold, color: COLORS.textSecondary },
  headCutoff: { flex: 1.15, textAlign: 'left' },
  headStatus: { flex: 1, textAlign: 'left' },
  catBadge: {
    flex: 2.15,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: FONTS.bold,
    lineHeight: 14,
  },

  mappingBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mappingTitle: {
    fontSize: 12,
    fontWeight: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  mappingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  tipBox: {
    borderRadius: RADIUS.sm,
    padding: 14,
    marginTop: 12,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: FONTS.semibold,
  },
  expandBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 4,
  },
  expandText: {
    fontSize: 13,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
  },

  disclaimer: {
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.sm,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  disclaimerText: {
    fontSize: 12,
    color: COLORS.warning,
    lineHeight: 18,
    fontWeight: FONTS.medium,
  },
});
