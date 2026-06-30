# GrowSmart Health 🌱

**Klasifikasi Status Tumbuh Kembang dan Gizi Balita Menggunakan LightGBM dan XGBoost**
Menggunakan model LightGBM & XGBOOST

Skripsi: Puspa Indah / 535220035 — Universitas Tarumanagara

---

## 📁 Struktur Proyek

```
growsmart/
├── expo/                    ← React Native / Expo project
│   ├── App.js               ← Entry point + navigasi
│   ├── app.json             ← Expo config (nama, icon, splash)
│   ├── babel.config.js
│   ├── screens/
│   │   ├── BerandaScreen.js ← Dashboard & statistik
│   │   ├── DeteksiScreen.js ← Form input & analisis
│   │   ├── HasilScreen.js   ← Hasil analisis 3 indikator
│   │   ├── RiwayatScreen.js ← Riwayat pemeriksaan
│   │   └── PanduanScreen.js ← Panduan gizi WHO
│   ├── utils/
│   │   ├── predict.js       ← Engine klasifikasi WHO z-score
│   │   ├── storage.js       ← AsyncStorage wrapper
│   │   └── theme.js         ← Design tokens & warna
│   └── assets/              ← Gambar & ikon
│
└── pwa/                     ← Progressive Web App
    ├── index.html           ← Aplikasi lengkap (single file)
    ├── manifest.json        ← PWA manifest (installable)
    ├── sw.js                ← Service worker (offline)
    └── icons/               ← Icon 192px & 512px
```

---

## 🚀 Cara Menjalankan

### Opsi A — Expo / React Native

**1. Install dependencies**
```bash
cd expo
npm install
# atau
yarn install
```

**2. Jalankan di HP (Expo Go)**
```bash
npx expo start
```
- Install **Expo Go** di HP (Play Store / App Store)
- Scan QR code yang muncul di terminal

**3. Build APK Android**
```bash
# Install EAS CLI
npm install -g eas-cli

# Login ke Expo account (buat di expo.dev)
eas login

# Build APK
eas build --platform android --profile preview
```

**4. Build untuk Web (PWA dari Expo)**
```bash
npx expo export:web
```

---

### Opsi B — PWA (Langsung di Browser HP)

**1. Lokal (development)**
```bash
cd pwa
npx serve .         # atau: python3 -m http.server 8080
```
Buka di HP: `http://[IP_komputer]:8080`

**2. Deploy ke hosting (gratis)**

**Netlify (paling mudah):**
- Drag-drop folder `pwa/` ke netlify.com/drop
- Dapatkan URL → buka di HP → klik "Add to Home Screen"

**GitHub Pages:**
```bash
cd pwa
git init && git add . && git commit -m "deploy"
gh repo create growsmart-pwa --public --push
# Aktifkan GitHub Pages di repo settings
```

**Vercel:**
```bash
cd pwa
npx vercel --prod
```

**3. Install ke HP**
- Buka URL di Chrome Android → ⋮ menu → "Add to Home Screen"
- iOS Safari → Share → "Add to Home Screen"

---

## 📱 Fitur Aplikasi

| Fitur | Deskripsi |
|-------|-----------|
| 🔬 Deteksi Gizi | Input usia, BB, TB → analisis 3 indikator |
| 📊 Hasil Analisis | Status BB/U, TB/U, BB/TB + probabilitas + rekomendasi |
| 📋 Riwayat | Simpan & filter semua pemeriksaan |
| 📖 Panduan Gizi | Referensi WHO + penjelasan model AI |
| 📲 Offline | PWA bekerja tanpa internet |

---

## 🤖 Model Machine Learning

| Indikator | Model | Jenis |
|-----------|-------|-------|
| BB/U (Weight-for-Age) | XGBoost | Multi-class (Normal/Underfed/Malnutrition/Overnutrition) |
| TB/U (Height-for-Age) | LightGBM | Binary (Not Stunted/Stunted) |
| BB/TB (Weight-for-Height) | XGBoost | Multi-class (Normal/Thin/Very Thin/Obese) |

**Dataset:** Stunting and Nutritional Status of Toddler from Jeneponto Regency  
**Sumber:** Mendeley Data (14.326 sampel setelah preprocessing)  
**Fitur:** Usia (bulan), Berat Badan (kg), Tinggi Badan (cm)

---

**Deploy API gratis:** Railway.app, Render.com, atau Koyeb.com

---

## 📋 Dependencies Expo

```json
{
  "expo": "~51.0.0",
  "react-native": "0.74.5",
  "@react-navigation/native": "^6.1.17",
  "@react-navigation/bottom-tabs": "^6.5.20",
  "@react-navigation/stack": "^6.3.29",
  "expo-linear-gradient": "~13.0.2",
  "@react-native-async-storage/async-storage": "1.23.1",
  "react-native-screens": "3.31.1",
  "react-native-safe-area-context": "4.10.5"
}
```

---

*GrowSmart Health — Membantu skrining stunting dan status gizi balita secara praktis*
