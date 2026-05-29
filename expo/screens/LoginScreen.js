// React dan useState dipakai untuk mengelola mode login/register serta nilai form.
import React, { useState } from 'react';

// Komponen React Native untuk input akun, tombol, layout, loading, alert, dan keyboard.
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';

// Konstanta tema aplikasi agar tampilan login konsisten dengan screen lain.
import { COLORS, FONTS, RADIUS, SHADOW } from '../utils/theme';

// Helper autentikasi untuk login, register, dan menyimpan user aktif.
import { loginUser, registerUser, saveAuthUser } from '../utils/storage';

// Wrapper gradient yang menyesuaikan platform web dan native.
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
        colors={[COLORS.primaryDeep, COLORS.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={style}
      >
        {children}
      </LinearGradient>
    );
  } catch {
    // Fallback warna solid bila gradient gagal dimuat.
    return <View style={[{ backgroundColor: COLORS.primary }, style]}>{children}</View>;
  }
}

// Halaman login dan register user.
export default function LoginScreen({ onLogin }) {
  // Mode menentukan apakah form sedang login atau register.
  const [mode, setMode] = useState('login');
  // State form identitas dan password.
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Loading dipakai saat request login/register berjalan.
  const [loading, setLoading] = useState(false);

  // Alert dibuat kompatibel untuk web dan native.
  function showAlert(title, message) {
    if (Platform.OS === 'web') window.alert(`${title}\n${message}`);
    else Alert.alert(title, message);
  }

  // Proses login: normalisasi username, panggil backend, simpan user, lalu masuk aplikasi.
  async function handleLogin() {
    const cleanUsername = username.trim().toLowerCase();

    // Beri jeda kecil agar loading state terlihat.
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 450));

    try {
      const user = await loginUser(cleanUsername, password);
      await saveAuthUser(user);
      setLoading(false);
      onLogin(user);
    } catch (e) {
      setLoading(false);
      showAlert('Login Gagal', e.message || 'Username atau password salah.');
    }
  }

  // Proses register: validasi password, buat akun, simpan user, lalu masuk aplikasi.
  async function handleRegister() {
    if (password !== confirmPassword) {
      showAlert('Register Gagal', 'Konfirmasi password tidak sama.');
      return;
    }

    // Beri jeda kecil agar loading state terlihat.
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 450));

    try {
      const user = await registerUser({ name, username, password });
      const authUser = { ...user, loggedInAt: new Date().toISOString() };
      await saveAuthUser(authUser);
      setLoading(false);
      onLogin(authUser);
    } catch (e) {
      setLoading(false);
      showAlert('Register Gagal', e.message || 'Gagal membuat akun.');
    }
  }

  // Mengganti mode form sekaligus membersihkan input.
  function switchMode(nextMode) {
    setMode(nextMode);
    setName('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  }

  // Render form login/register.
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <HeroGrad style={styles.hero}>
        <Text style={styles.logo}>GrowSmart</Text>
        <Text style={styles.title}>Health</Text>
        <Text style={styles.subtitle}>Masuk untuk memantau status gizi balita</Text>
      </HeroGrad>

      <View style={styles.card}>
        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'login' && styles.segmentBtnActive]}
            onPress={() => switchMode('login')}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'register' && styles.segmentBtnActive]}
            onPress={() => switchMode('register')}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, mode === 'register' && styles.segmentTextActive]}>Register</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.cardTitle}>{mode === 'login' ? 'Login' : 'Buat Akun'}</Text>
        <Text style={styles.cardSub}>
          {mode === 'login'
            ? 'Masuk dengan akun yang sudah terdaftar.'
            : 'Daftarkan akun lokal untuk menggunakan aplikasi.'}
        </Text>

        {mode === 'register' && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nama Lengkap</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Puspa Indah"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimal 3 karakter"
            placeholderTextColor={COLORS.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Minimal 6 karakter"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)} activeOpacity={0.75}>
              <Text style={styles.eyeText}>{showPassword ? 'Sembunyi' : 'Lihat'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {mode === 'register' && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Konfirmasi Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Ulangi password"
              placeholderTextColor={COLORS.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={mode === 'login' ? handleLogin : handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginText}>{mode === 'login' ? 'Masuk' : 'Daftar & Masuk'}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hero: {
    paddingTop: 70,
    paddingBottom: 58,
    paddingHorizontal: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: FONTS.black,
    color: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: FONTS.black,
    color: '#fff',
    marginTop: -4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,.82)',
    marginTop: 10,
    lineHeight: 20,
  },
  card: {
    marginHorizontal: 18,
    marginTop: -30,
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 20,
    ...SHADOW.md,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: FONTS.black,
    color: COLORS.text,
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 18,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: FONTS.bold,
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: '#fff',
  },
  fieldGroup: { marginBottom: 15 },
  label: {
    fontSize: 13,
    fontWeight: FONTS.semibold,
    color: COLORS.text,
    marginBottom: 8,
  },
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
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 88 },
  eyeBtn: {
    position: 'absolute',
    right: 8,
    top: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
  },
  eyeText: {
    fontSize: 11,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
  },
  loginBtn: {
    marginTop: 4,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 15,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  loginBtnDisabled: { backgroundColor: COLORS.textMuted },
  loginText: {
    fontSize: 15,
    fontWeight: FONTS.bold,
    color: '#fff',
  },
});
