// AsyncStorage dipakai untuk penyimpanan lokal data login dan cache riwayat di perangkat.
import AsyncStorage from '@react-native-async-storage/async-storage';

// BASE_URL menjadi alamat dasar backend untuk request akun dan riwayat.
import { BASE_URL } from './api';

// Key penyimpanan lokal untuk data user yang sedang login.
const AUTH_KEY = 'growsmart_auth_user';

// Helper request JSON agar semua endpoint backend punya pola error handling yang sama.
async function requestJson(path, options = {}) {
  // Gabungkan base URL backend dengan path endpoint yang diminta.
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  // Coba baca body JSON, jika gagal gunakan object kosong.
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

// Mengambil id user aktif dari data login yang tersimpan.
async function currentUserId() {
  const user = await loadAuthUser();
  return user?.id ?? null;
}

// Memuat riwayat pemeriksaan user dari backend MySQL.
export async function loadHistory() {
  try {
    const userId = await currentUserId();
    if (!userId) return [];

    const data = await requestJson(`/history?user_id=${encodeURIComponent(userId)}`);
    return data.history || [];
  } catch (e) {
    console.warn('MySQL load history error:', e);
    return [];
  }
}

// Menyimpan ulang seluruh riwayat user ke backend.
export async function saveHistory(history) {
  try {
    const userId = await currentUserId();
    if (!userId) return;

    // Kosongkan riwayat lama agar data backend sama dengan state terbaru.
    await requestJson('/history/clear', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });

    // Kirim ulang data dari yang paling lama agar urutan saat dibaca tetap benar.
    for (const record of [...history].reverse()) {
      await requestJson('/history', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, record }),
      });
    }
  } catch (e) {
    console.warn('MySQL save history error:', e);
  }
}

// Menambahkan satu record pemeriksaan baru ke riwayat user aktif.
export async function addRecord(record) {
  try {
    const user = await loadAuthUser();
    if (!user?.id) return [];

    // Lengkapi record dengan identitas user supaya riwayat mudah dilacak.
    const recordWithUser = {
      ...record,
      userId: user.id,
      userName: user.name,
      username: user.username,
    };

    const data = await requestJson('/history', {
      method: 'POST',
      body: JSON.stringify({ user_id: user.id, record: recordWithUser }),
    });

    return data.history || [];
  } catch (e) {
    console.warn('MySQL add record error:', e);
    return loadHistory();
  }
}

// Menghapus semua riwayat pemeriksaan milik user aktif.
export async function clearHistory() {
  try {
    const userId = await currentUserId();
    if (!userId) return;

    await requestJson('/history/clear', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  } catch (e) {
    console.warn('MySQL clear history error:', e);
  }
}

// Membaca data auth user dari AsyncStorage.
export async function loadAuthUser() {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Menyimpan data auth user ke AsyncStorage.
export async function saveAuthUser(user) {
  try {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('Auth save error:', e);
  }
}

// Menghapus data auth user dari AsyncStorage saat logout.
export async function clearAuthUser() {
  try {
    await AsyncStorage.removeItem(AUTH_KEY);
  } catch (e) {
    console.warn('Auth clear error:', e);
  }
}

// Mendaftarkan user baru melalui endpoint register backend.
export async function registerUser({ name, username, password }) {
  const data = await requestJson('/register', {
    method: 'POST',
    body: JSON.stringify({ name, username, password }),
  });

  return data.user;
}

// Login user melalui endpoint login backend.
export async function loginUser(username, password) {
  const data = await requestJson('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  return data.user;
}
