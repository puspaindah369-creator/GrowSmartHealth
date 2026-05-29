// Mengaktifkan dukungan gesture React Native sebelum navigator dipakai.
import 'react-native-gesture-handler';

// React dan hook dipakai untuk membuat komponen utama serta mengelola status login.
import React, { useEffect, useState } from 'react';

// StatusBar mengatur tampilan status bar aplikasi Expo.
import { StatusBar } from 'expo-status-bar';

// NavigationContainer menjadi pembungkus utama seluruh navigasi aplikasi.
import { NavigationContainer } from '@react-navigation/native';

// Membuat navigasi tab bawah untuk menu utama.
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Membuat navigasi stack untuk membuka halaman bertingkat seperti hasil deteksi.
import { createStackNavigator } from '@react-navigation/stack';

// Komponen React Native untuk layout, teks, styling, dan pengecekan platform.
import { View, Text, StyleSheet, Platform } from 'react-native';

// SafeAreaProvider menjaga tampilan aman dari notch atau area sistem perangkat.
import { SafeAreaProvider } from 'react-native-safe-area-context';

// GestureHandlerRootView menjadi root agar gesture/touch navigator berjalan stabil.
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Halaman beranda aplikasi setelah user login.
import BerandaScreen from './screens/BerandaScreen';

// Halaman form deteksi status gizi balita.
import DeteksiScreen from './screens/DeteksiScreen';

// Halaman tampilan hasil analisis deteksi.
import HasilScreen from './screens/HasilScreen';

// Halaman riwayat pemeriksaan user.
import RiwayatScreen from './screens/RiwayatScreen';

// Halaman panduan indikator dan kategori gizi.
import PanduanScreen from './screens/PanduanScreen';

// Halaman informasi aplikasi dan tombol logout.
import AboutScreen from './screens/AboutScreen';

// Halaman login dan register akun.
import LoginScreen from './screens/LoginScreen';

// Konstanta tema untuk warna, font, dan bayangan global aplikasi.
import { COLORS, FONTS, SHADOW } from './utils/theme';

// Helper penyimpanan untuk mengambil dan menghapus data user login.
import { clearAuthUser, loadAuthUser } from './utils/storage';

// Membuat navigator tab bawah untuk menu utama aplikasi.
const Tab = createBottomTabNavigator();
// Membuat navigator stack untuk halaman yang dibuka di atas tab, seperti Hasil.
const Stack = createStackNavigator();

// Komponen ikon tab biasa, menerima emoji dan status aktif.
function TabIcon({ emoji, focused }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Text style={{ fontSize: focused ? 22 : 20 }}>{emoji}</Text>
    </View>
  );
}

// Komponen ikon khusus untuk tab Deteksi yang dibuat lebih menonjol.
function DetectTabIcon() {
  return (
    <View style={styles.detectBubble}>
      <Text style={{ fontSize: 22 }}>🔬</Text>
    </View>
  );
}

// Kumpulan tab utama setelah user berhasil login.
function MainTabs({ onLogout, authUser }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {/* Mengirim data user login ke halaman Beranda. */}
      <Tab.Screen
        name="Beranda"
        children={(props) => <BerandaScreen {...props} authUser={authUser} />}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
          tabBarLabel: 'Beranda',
        }}
      />

      <Tab.Screen
        name="Riwayat"
        component={RiwayatScreen}
        options={{
          headerShown: true,
          headerTitle: 'Riwayat Pemeriksaan',
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: {
            fontWeight: FONTS.bold,
            color: COLORS.text,
            fontSize: 17,
          },
          headerShadowVisible: false,
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
          tabBarLabel: 'Riwayat',
        }}
      />

      <Tab.Screen
        name="Deteksi"
        component={DeteksiScreen}
        options={{
          tabBarIcon: () => <DetectTabIcon />,
          tabBarLabel: 'Deteksi',
          tabBarItemStyle: { marginTop: -6 },
        }}
      />

      <Tab.Screen
        name="Panduan"
        component={PanduanScreen}
        options={{
          headerShown: true,
          headerTitle: 'Panduan Gizi',
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: {
            fontWeight: FONTS.bold,
            color: COLORS.text,
            fontSize: 17,
          },
          headerShadowVisible: false,
          tabBarIcon: ({ focused }) => <TabIcon emoji="📖" focused={focused} />,
          tabBarLabel: 'Panduan',
        }}
      />

      {/* Mengirim callback logout supaya halaman About bisa keluar dari akun. */}
      <Tab.Screen
        name="About"
        children={() => <AboutScreen onLogout={onLogout} />}
        options={{
          headerShown: true,
          headerTitle: 'Tentang Aplikasi',
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: {
            fontWeight: FONTS.bold,
            color: COLORS.text,
            fontSize: 17,
          },
          headerShadowVisible: false,
          tabBarIcon: ({ focused }) => <TabIcon emoji="ℹ️" focused={focused} />,
          tabBarLabel: 'About',
        }}
      />
    </Tab.Navigator>
  );
}

// Entry point aplikasi Expo/React Native.
export default function App() {
  // Menyimpan data user yang sedang login.
  const [authUser, setAuthUser] = useState(null);
  // Menandai proses pengecekan login awal dari AsyncStorage.
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Saat aplikasi pertama dibuka, ambil user login dari penyimpanan lokal.
  useEffect(() => {
    loadAuthUser().then((user) => {
      setAuthUser(user);
      setCheckingAuth(false);
    });
  }, []);

  // Menghapus sesi login dari storage lalu mengembalikan user ke halaman login.
  async function handleLogout() {
    await clearAuthUser();
    setAuthUser(null);
  }

  // Tampilan sementara selama aplikasi membaca status login.
  if (checkingAuth) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.loadingScreen}>
            <Text style={styles.loadingText}>GrowSmart Health</Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Jika belum login, tampilkan halaman Login/Register.
  if (!authUser) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <LoginScreen onLogin={setAuthUser} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Jika sudah login, tampilkan navigasi utama aplikasi.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs">
              {() => <MainTabs onLogout={handleLogout} authUser={authUser} />}
            </Stack.Screen>
            <Stack.Screen
              name="Hasil"
              component={HasilScreen}
              options={{
                headerShown: true,
                headerTitle: 'Hasil Analisis',
                headerStyle: { backgroundColor: COLORS.primaryDeep },
                headerTitleStyle: {
                  color: '#fff',
                  fontWeight: FONTS.bold,
                  fontSize: 17,
                },
                headerTintColor: '#fff',
                headerShadowVisible: false,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'web' ? 60 : 70,
    paddingBottom: Platform.OS === 'web' ? 6 : 8,
    paddingTop: 6,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOW.sm,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: FONTS.semibold,
    marginTop: 2,
  },
  tabIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabIconActive: {
    backgroundColor: COLORS.primaryLight,
  },
  detectBubble: {
    width: 52,
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    borderWidth: 3,
    borderColor: '#fff',
    ...SHADOW.lg,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: FONTS.black,
    color: COLORS.primary,
  },
});
