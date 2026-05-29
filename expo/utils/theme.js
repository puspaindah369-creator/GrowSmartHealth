// Design Tokens — GrowSmart Health
// Dimensions dipakai untuk membaca ukuran layar agar komponen bisa dibuat responsif.
import { Dimensions } from 'react-native';

// Ukuran layar dipakai bila komponen perlu responsif terhadap dimensi device.
export const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Palet warna utama aplikasi agar styling konsisten di semua screen.
export const COLORS = {
  primary:       '#EC4899',
  primaryDark:   '#DB2777',
  primaryDeep:   '#BE185D',
  primaryLight:  '#FDF2F8',
  primaryMid:    '#FBCFE8',

  success:       '#16A34A',
  successLight:  '#F0FDF4',
  successMid:    '#BBF7D0',

  warning:       '#D97706',
  warningLight:  '#FFFBEB',
  warningMid:    '#FDE68A',

  danger:        '#DC2626',
  dangerLight:   '#FEF2F2',
  dangerMid:     '#FECACA',

  orange:        '#EA580C',
  orangeLight:   '#FFF7ED',

  purple:        '#A21CAF',
  purpleLight:   '#FDF4FF',

  bg:            '#FFF7FB',
  card:          '#FFFFFF',
  text:          '#0F172A',
  textSecondary: '#64748B',
  textMuted:     '#94A3B8',
  border:        '#FBCFE8',
  divider:       '#FCE7F3',
};

// Bobot font yang sering dipakai pada komponen UI.
export const FONTS = {
  black:       '800',
  bold:        '700',
  semibold:    '600',
  medium:      '500',
  regular:     '400',
  light:       '300',
};

// Radius sudut standar untuk card, tombol, input, dan badge.
export const RADIUS = {
  xs:  6,
  sm:  10,
  md:  14,
  lg:  20,
  xl:  28,
  full: 999,
};

// Preset shadow lintas iOS/Android/web untuk kedalaman visual.
export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Konfigurasi visual untuk status per indikator: normal, warning, danger, info.
export const STATUS_CONFIG = {
  normal: {
    bg: '#F0FDF4',
    text: '#16A34A',
    border: '#BBF7D0',
    label: 'Normal',
    emoji: '✅',
  },
  warning: {
    bg: '#FFFBEB',
    text: '#D97706',
    border: '#FDE68A',
    label: 'Perlu Perhatian',
    emoji: '⚠️',
  },
  danger: {
    bg: '#FEF2F2',
    text: '#DC2626',
    border: '#FECACA',
    label: 'Kritis',
    emoji: '🔴',
  },
  info: {
    bg: '#FDF2F8',
    text: '#DB2777',
    border: '#FBCFE8',
    label: 'Perhatian',
    emoji: 'ℹ️',
  },
};

// Konfigurasi visual untuk ringkasan status keseluruhan hasil analisis.
export const OVERALL_CONFIG = {
  normal: {
    label: 'Normal',
    emoji: '✅',
    color: '#16A34A',
    bg: '#F0FDF4',
    border: '#BBF7D0',
  },
  perhatian: {
    label: 'Perlu Perhatian',
    emoji: '⚠️',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  buruk: {
    label: 'Kritis',
    emoji: '🔴',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
  },
};
