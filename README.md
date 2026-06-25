# MyAnime - Aplikasi Streaming Anime (Cross-Platform)

Aplikasi mobile & web cross-platform untuk menjelajahi dan menonton anime dengan subtitle Indonesia. Dibangun menggunakan **React Native** dan **Expo SDK** dengan dukungan performa tinggi dan desain UI modern.

---

## 🎯 Platform Support

Aplikasi ini dapat dijalankan pada platform-platform berikut:
- **Android** (Melalui Expo Go / Android Emulator / APK Build)
- **iOS** (Melalui Expo Go / iOS Simulator / IPA Build)
- **Web Browser** (Menggunakan React Native Web)

---

## 📱 Fitur Utama

### 🎬 Streaming Video
- Nonton anime dengan kualitas HD.
- Pilihan server streaming alternatif untuk setiap episode.
- Pemutar video kustom dengan kontrol pemutaran penuh pada Mobile & iframe responsive pada Web Desktop.

### 📜 Riwayat Tontonan (Watch History)
- Menandai episode yang sudah ditonton secara otomatis untuk pengguna yang masuk (Logged In).
- Tampilan list episode yang sudah ditonton akan berubah warna (lebih gelap/redup) untuk membedakan episode yang belum dan sudah ditonton.
- Pada **Web Desktop**, riwayat dipicu ketika menekan tombol *"Klik untuk Memutar Video"* pada video player.
- Pada **Mobile**, riwayat dipicu secara otomatis ketika membuka halaman pemutaran video.

### ⭐ Bookmark & My List
- Menyimpan anime favorit ke daftar Bookmark pribadi.
- Sinkronisasi instan ke server berbasis profil pengguna.
- Akses cepat langsung dari tab navigasi.

### 🎨 UI/UX Responsif & Tema
- Dukungan **Dark Mode** & **Light Mode** dinamis mengikuti preferensi sistem atau tema yang dipilih.
- Tampilan layout responsif (Tata letak Grid pada Mobile, layout Kolom Ganda Split-View yang premium pada Web Desktop).

---

## ⚙️ Prasyarat (Prerequisites)

Sebelum menjalankan aplikasi, pastikan komputer Anda sudah memiliki perkakas berikut:
1. **Node.js** (Versi v18 atau v20 direkomendasikan).
2. **NPM** (Bawaan Node.js) atau **Yarn**.
3. **Expo Go** (Aplikasi di Play Store / App Store) jika ingin menguji langsung di HP fisik Anda.
4. **Android Studio** & Emulator Android (untuk platform Android di PC).
5. **Xcode** (Hanya macOS, untuk Simulator iOS).

---

## 🚀 Instalasi & Setup

1. **Clone repositori** ini ke perangkat lokal Anda.
2. **Masuk ke direktori proyek**:
   ```bash
   cd anime-stream
   ```
3. **Instal seluruh dependensi**:
   ```bash
   npm install
   ```
4. **Konfigurasi Environment Variables**:
   Salin berkas `.env.example` menjadi `.env` di root folder proyek:
   ```bash
   cp .env.example .env
   ```
   Buka berkas `.env` dan lengkapi nilainya:
   ```env
   # API Utama untuk mengambil data anime (menggunakan proxy di Web Browser untuk bypass CORS)
   EXPO_PUBLIC_ANIME_API_BASE_URL=https://nganimeapi.zatwasdead.my.id/api/proxy

   # API Authentication & Riwayat (History)
   EXPO_PUBLIC_AUTH_API_BASE_URL=https://nganimeapi.zatwasdead.my.id
   ```

---

## 💻 Cara Running Aplikasi

Jalankan perintah berikut di terminal root proyek Anda:

### 1. Memulai Expo Development Server
Perintah ini memulai Metro Bundler. Anda bisa memindai QR Code menggunakan aplikasi **Expo Go** di Android atau Kamera bawaan di iOS untuk menjalankan aplikasi di HP fisik secara nirkabel.
```bash
npm run dev
# atau
npm start
```

### 2. Menjalankan di Android Emulator
Pastikan emulator Android Anda sudah aktif atau perangkat Android tersambung dengan USB Debugging aktif:
```bash
npm run android
```

### 3. Menjalankan di iOS Simulator (Khusus macOS)
Pastikan simulator iOS sudah terpasang dan siap:
```bash
npm run ios
```

### 4. Menjalankan di Web Browser
Untuk menjalankan visualisasi web responsif langsung di peramban Anda:
```bash
npm run web
```

---

## 🛠️ Skrip NPM Berguna

- `npm run clean`: Menghapus folder `node_modules` dan berkas `package-lock.json` kemudian melakukan instalasi ulang (berguna jika terjadi konflik dependensi).
- `npm run clear-cache`: Menjalankan Expo dev server sembari membersihkan cache builder (`expo start -c`).
- `npm run clear-all`: Membersihkan seluruh cache Metro, folder build native, folder `.expo`, `node_modules`, dan memasang ulang dependensi.
- `npx tsc --noEmit`: Memvalidasi tipe TypeScript di seluruh berkas proyek guna memastikan tidak ada compile-time error.

---

## 📁 Struktur Direktori Penting

```
anime-stream/
├── src/
│   ├── components/     # Komponen UI reusable (EpisodeList, CommentSection, dll)
│   ├── context/        # State management global (ThemeContext, AuthContext)
│   ├── screens/        # Layar-layar utama aplikasi (EpisodeScreen, VideoScreenWebView, dll)
│   ├── services/       # Integrasi API client & Axios Configuration (api.ts)
│   └── types/          # Type definitions TypeScript (drama.ts, episode.ts)
├── App.tsx             # Entrypoint & Konfigurasi Navigasi Utama
├── app.json            # Konfigurasi aplikasi Expo
└── package.json        # Pengaturan dependensi & skrip NPM
```

---

**Selamat menonton anime! 🎬**
