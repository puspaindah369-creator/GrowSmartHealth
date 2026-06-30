// React dan hook dipakai untuk mengelola filter riwayat dan memuat ulang data saat screen fokus.
import React, { useState, useCallback } from 'react';

// Komponen React Native untuk layout riwayat, teks, scroll, tombol, styling, dan dialog alert.
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

// useFocusEffect menjalankan pemuatan riwayat setiap halaman kembali aktif.
import { useFocusEffect } from '@react-navigation/native';

// Konstanta tema dan konfigurasi ringkasan status untuk tampilan riwayat.
import {
  COLORS,
  FONTS,
  RADIUS,
  SHADOW,
  OVERALL_CONFIG,
} from '../utils/theme';

// Helper untuk mengambil dan menyimpan data riwayat pemeriksaan.
import { loadHistory, saveHistory } from '../utils/storage';

// Daftar filter status yang muncul sebagai chip di bagian atas riwayat.
const FILTERS = [
  { key: 'semua', label: 'Semua', emoji: null },
  { key: 'normal', label: 'Normal', emoji: '✅' },
  { key: 'perhatian', label: 'Perlu Perhatian', emoji: '⚠️' },
  { key: 'buruk', label: 'Kritis', emoji: '🔴' },
];

// Warna badge untuk status tiap indikator.
const CLS_BADGE = {
  normal:  { bg: COLORS.successLight, text: COLORS.success },
  warning: { bg: COLORS.warningLight, text: COLORS.warning },
  danger:  { bg: COLORS.dangerLight, text: COLORS.danger },
  info:    { bg: COLORS.primaryLight, text: COLORS.primary },
};

// Format tanggal pemeriksaan dari record riwayat.
function formatTanggalCek(record) {
  const d = new Date(record.tanggalPengukuran || record.result?.input?.date_of_measurement || record.date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Format tanggal lahir dari record riwayat.
function formatTanggalLahir(record) {
  const d = new Date(record.tanggalLahir || record.result?.input?.date_of_birth);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Halaman daftar riwayat pemeriksaan user.
export default function RiwayatScreen({ navigation }) {
  // Menyimpan semua record riwayat yang diambil dari backend/storage.
  const [history, setHistory] = useState([]);
  // Menyimpan filter aktif: semua, normal, perhatian, atau buruk.
  const [filter, setFilter] = useState('semua');

  // Muat ulang riwayat setiap halaman ini aktif/fokus.
  useFocusEffect(
    useCallback(() => {
      loadHistory().then(setHistory);
    }, [])
  );

  // Data yang ditampilkan mengikuti filter aktif.
  const filtered =
    filter === 'semua'
      ? history
      : history.filter((h) => h.result.overall === filter);

  // Hapus satu record berdasarkan item yang sedang terlihat di daftar terfilter.
  function handleDelete(idx) {
    // Cari index asli di array history karena filtered bisa berbeda urutan/panjang.
    const realIdx = history.indexOf(filtered[idx]);
    Alert.alert('Hapus Riwayat', `Hapus data ${filtered[idx].nama}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          // Buat salinan array agar state React ter-update dengan benar.
          const updated = [...history];
          updated.splice(realIdx, 1);
          setHistory(updated);
          await saveHistory(updated);
        },
      },
    ]);
  }

  // Hapus seluruh riwayat setelah user mengonfirmasi.
  function handleClearAll() {
    Alert.alert(
      'Hapus Semua',
      'Ini akan menghapus semua riwayat pemeriksaan. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Semua',
          style: 'destructive',
          onPress: async () => {
            setHistory([]);
            await saveHistory([]);
          },
        },
      ]
    );
  }

  // Render filter, empty state, dan daftar kartu riwayat.
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.8}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
          >
            <View style={styles.filterChipInner}>
              {f.emoji ? (
                <Text
                  style={[
                    styles.filterEmoji,
                    filter === f.key && styles.filterTextActive,
                  ]}
                >
                  {f.emoji}
                </Text>
              ) : null}

              <Text
                numberOfLines={1}
                style={[
                  styles.filterText,
                  filter === f.key && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingTop: 10, paddingBottom: 36 }}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
            <Text style={styles.emptyTitle}>Belum ada riwayat</Text>
            <Text style={styles.emptyDesc}>
              {filter === 'semua'
                ? 'Lakukan pemeriksaan untuk mulai merekam data pertumbuhan balita'
                : `Tidak ada data dengan status "${
                    FILTERS.find((f) => f.key === filter)?.label
                  }"`}
            </Text>

            {filter === 'semua' && (
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('Deteksi')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyBtnText}>🔬  Mulai Deteksi</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {history.length > 0 && filter === 'semua' && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearAll}
                activeOpacity={0.8}
              >
                <Text style={styles.clearBtnText}>🗑️  Hapus Semua</Text>
              </TouchableOpacity>
            )}

            {filtered.map((h, i) => {
              const ov = OVERALL_CONFIG[h.result.overall];
              const tanggalCek = formatTanggalCek(h);
              const tanggalLahir = formatTanggalLahir(h);

              return (
                <TouchableOpacity
                  key={i}
                  style={styles.riwayatCard}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('Hasil', { data: h, readonly: true })}
                  onLongPress={() => handleDelete(i)}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName}>{h.nama}</Text>
                      <Text style={styles.cardDate}>Tanggal pemeriksaan: {tanggalCek}</Text>
                      <Text style={styles.cardDate}>Tanggal lahir: {tanggalLahir}</Text>
                    </View>

                    <View
                      style={[
                        styles.overallBadge,
                        {
                          backgroundColor: `${ov.bg}30`,
                          borderColor: ov.border || ov.bg,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 12 }}>{ov.emoji}</Text>
                      <Text style={[styles.overallText, { color: ov.color }]}>
                        {ov.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statsRow}>
                    {[
                      { icon: '🎂', val: `${h.usia} bln` },
                      { icon: '⚖️', val: `${h.bb} kg` },
                      { icon: '📏', val: `${h.tb} cm` },
                    ].map((s, j) => (
                      <View key={j} style={styles.statPill}>
                        <Text style={styles.statText}>
                          {s.icon}  {s.val}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.indRow}>
                    {[
                      { key: 'BB/U', cls: h.result.wa.cls, lbl: h.result.wa.result },
                      { key: 'TB/U', cls: h.result.ha.cls, lbl: h.result.ha.result },
                      { key: 'BB/TB', cls: h.result.wh.cls, lbl: h.result.wh.result },
                    ].map((ind, j) => {
                      const bc = CLS_BADGE[ind.cls] || CLS_BADGE.normal;
                      return (
                        <View key={j} style={[styles.indBadge, { backgroundColor: bc.bg }]}>
                          <Text style={[styles.indBadgeText, { color: bc.text }]}>
                            {ind.key}: {ind.lbl}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <Text style={styles.longPressHint}>Tekan lama untuk hapus</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  filterRow: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    flexGrow: 0,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    alignItems: 'center',
  },
  filterChip: {
    minHeight: 42,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  filterEmoji: {
    fontSize: 20,
    lineHeight: 22,
  },
  filterText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: FONTS.semibold,
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#fff',
  },

  riwayatCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    ...SHADOW.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardName: {
    fontSize: 16,
    fontWeight: FONTS.bold,
    color: COLORS.text,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  overallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  overallText: {
    fontSize: 11,
    fontWeight: FONTS.bold,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statPill: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  statText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },

  indRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  indBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  indBadgeText: {
    fontSize: 11,
    fontWeight: FONTS.bold,
  },

  longPressHint: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'right',
  },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: 110,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: FONTS.bold,
    color: COLORS.text,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: RADIUS.full,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: FONTS.bold,
    color: '#fff',
  },

  clearBtn: {
    alignSelf: 'flex-end',
    marginBottom: 12,
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: FONTS.semibold,
    color: COLORS.danger,
  },
});
