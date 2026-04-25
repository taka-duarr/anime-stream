# DramaBox VIP - Setup Guide

Proyek ini adalah aplikasi React Native yang dibangun menggunakan **Expo**. Proyek ini menggunakan _TypeScript_, _React Navigation_ untuk pindah antar layar, _Axios_ untuk urusan API, dan _Expo AV_ (mungkin digunakan untuk memutar video layaknya aplikasi DramaBox sesungguhnya).

Berikut adalah panduan langkah demi langkah untuk melakukan setup dan menjalankan proyek ini di komputer Anda setelah melakukan _clone_.

## Daftar Prasyarat (Prerequisites)

Sebelum memulai, pastikan Anda telah menginstal beberapa perangkat lunak berikut:

1.  **Node.js** (Sangat direkomendasikan menggunakan versi LTS). Anda dapat mengunduh dan menginstalnya dari [nodejs.org](https://nodejs.org/).
2.  **Aplikasi Expo Go** di _smartphone_ Anda (untuk mencoba aplikasi langsung di HP fisik):
    - [Expo Go untuk Android (Google Play Store)](https://play.google.com/store/apps/details?id=host.exp.exponent)
    - [Expo Go untuk iOS (App Store)](https://apps.apple.com/us/app/expo-go/id982107779)
      \__(Alternatif: Anda juga bisa menggunakan Emulator Android Studio di komputer Anda. Lihat langkah di bawah)._

---

## Langkah-langkah Setup (Step-by-Step)

### Opsi Tambahan: Menggunakan Emulator Android (Tanpa Handphone)

Jika Anda sudah pernah melakukan _setup_ Emulator (Virtual Device) melalui Android Studio, Anda tidak perlu lagi membuka Android Studio secara penuh hanya untuk menyalakan emulator. Anda bisa memanggilnya langsung dari Terminal!

1. Buka Terminal baru di VS Code secara berdampingan.
2. Cek nama emulator yang tersedia dengan perintah ini:
   ```bash
   & "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -list-avds
   ```
   *(Contoh *output* di laptop Anda: `Medium_Phone_API_36.1` atau `Pixel_4_Testing_Classroom`)*
3. Nyalakan emulator dengan perintah berikut (ganti dengan nama emulator Anda):
   ```bash
   & "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd "Medium_Phone_API_36.1"
   ```
4. Biarkan terminal itu tetap terbuka (emulator akan menyala), lalu di terminal proyek, jalankan `npm start` dan tekan tombol `a` seperti biasa.

### 1. Buka Terminal di Folder Proyek

Pastikan terminal Anda (CMD / PowerShell / Terminal Mac) sudah berada di dalam direktori proyek ini.

```bash
# Contoh (sesuaikan dengan lokasi Anda):
# cd d:\Kuliah\semester6\crossplatform\dramabox-vip
```

### 2. Instalasi Dependensi Terkait

Proyek ini mengandalkan `npm` (karena terdapat file `package-lock.json`). Anda wajib menginstal semua _library_ pendukung sebelum menjalankan aplikasinya. Ketik perintah berikut di terminal:

```bash
npm install
```

_Tunggu hingga proses instalasi selesai. Proses ini akan mengunduh semua package dan menghasilkan folder `node_modules`._

### 3. Menjalankan Development Server (Metro Bundler)

Setelah instalasi package selesai, jalankan server pengembangan lokal (Expo Metro Bundler) menggunakan perintah:

```bash
npm start
```

atau

```bash
npx expo start
```

_Tunggu beberapa saat sampai terminal memunculkan **QR Code**._

### 4. Membuka Aplikasi di Perangkat Mobile (HP)

Cara tercepat untuk mencoba aplikasi adalah menggunakan _smartphone_ fisik Anda:

- **PENTING:** Pastikan HP dan Komputer/Laptop Anda terhubung ke **jaringan WiFi atau koneksi internet yang sama**.
- **Untuk pengguna Android**: Buka aplikasi **Expo Go** di HP Anda, pilih opsi **"Scan QR Code"**, lalu arahkan kamera ke QR code yang muncul di layar komputer.
- **Untuk pengguna iPhone (iOS)**: Buka aplikasi kamera bawaan iPhone, arahkan ke QR code di layar komputer, lalu ketuk pop-up notifikasi ("Open in Expo Go") yang muncul.

Setelah terhubung, Expo Go akan mengunduh _bundle_ aplikasi secara otomatis dan Anda bisa langsung melihat sekaligus mencoba aplikasi DramaBox VIP di HP Anda.

> **Tips Tambahan:** Jika menggunakan emulator komputer, Anda cukup menekan tombol `a` pada keyboard saat terminal sedang berjalan untuk membuka aplikasi di Android Emulator, atau tombol `i` untuk iOS Simulator.

---

### Solusi Jika Terjadi Error Koneksi _Network_

Jika aplikasi tidak mau memuat (loading terus) di Expo Go Anda:

1. Pastikan WiFi komputer dan HP Anda sama.
2. Jika menggunakan Windows, pastikan **Network Profile** Anda diset ke **Private** (bukan Public), sehingga firewall tidak memblokir koneksi lokal dari dan ke Node.js.
3. Anda bisa mencoba menjalankan server melalui metode tunnel:
   ```bash
   npx expo start --tunnel
   ```
   Lalu scan QR code dari output command tersebut.
