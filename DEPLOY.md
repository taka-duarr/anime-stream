# Deploy Web NgAnime (React Native / Expo) di Server

Versi web app ini adalah hasil `expo export`: kumpulan file statis di folder `dist/`.
Jadi **tidak ada proses yang perlu di-restart**. Cukup build ulang `dist/`, lalu web server
(nginx/apache) otomatis menyajikan file barunya.

> Folder `dist/` dan file `.env` **tidak ikut git**, jadi harus dibuat di mesin yang melakukan build.

## Ringkas

```bash
cd /var/www/html/anime-stream      # folder app di server (sesuaikan)
git pull origin main
npm install
npx expo export --platform web -c
```

Hasilnya ada di `dist/`. Pastikan web server mengarah ke folder itu.

---

## 1. Prasyarat di server

- **Node.js 20 atau lebih baru** dan npm.

```bash
node -v
npm -v
```

Jika Node belum ada atau terlalu lama, lihat bagian "Alternatif: build di komputer sendiri" di bawah.

## 2. Pull kode terbaru

```bash
cd /var/www/html/anime-stream
git pull origin main
```

## 3. Cek file `.env`

`.env` harus ada di folder app. Nilai `EXPO_PUBLIC_*` **ditanam saat build**, jadi
setiap kali `.env` berubah, build ulang.

```ini
EXPO_PUBLIC_ANIME_API_BASE_URL=https://www.sankavollerei.web.id/anime
EXPO_PUBLIC_AUTH_API_BASE_URL=https://nganimeapi.takaaa.web.id
```

## 4. Install dependensi dan build

```bash
npm install
npx expo export --platform web -c
```

- `-c` membersihkan cache supaya perubahan terbaca.
- Build berhasil jika muncul pesan export selesai dan folder `dist/` terisi.

Cek isinya:

```bash
ls dist
```

Harus ada `index.html`, folder `_expo`, dan `assets`.

## 5. Arahkan web server ke `dist/`

Web ini SPA (satu `index.html`), jadi semua path harus jatuh ke `index.html`.

### nginx

```nginx
server {
    listen 80;
    server_name domainkamu.com;

    root /var/www/html/anime-stream/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Test dan reload (ini satu-satunya "restart" yang mungkin diperlukan, dan hanya jika config berubah):

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Apache

Taruh `.htaccess` di dalam folder `dist/` (aktifkan `mod_rewrite`):

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

```bash
sudo a2enmod rewrite
sudo systemctl reload apache2
```

> Karena `dist/` dibuat ulang setiap build, `.htaccess` bisa hilang. Simpan salinannya
> di luar `dist/` dan copy lagi setelah build, atau pakai config di level virtual host.

## 6. Cek hasilnya

Buka domain di browser lalu **hard refresh** (`Ctrl+Shift+R`) agar tidak memakai cache lama.

Cek dari terminal:

```bash
curl -I https://domainkamu.com/
```

Harus `200`. Tes juga membuka path langsung (misalnya halaman episode) lalu refresh;
jika muncul 404, fallback `index.html` di langkah 5 belum benar.

---

## Alternatif: build di komputer sendiri, upload `dist/`

Jika server tidak punya Node atau tidak kuat build:

Di komputer (folder `anime stream`):

```bash
npm install
npx expo export --platform web -c
```

Upload isi folder `dist/` ke server, menimpa isi lama:

```bash
scp -r dist/* root@IP_SERVER:/var/www/html/anime-stream/dist/
```

Tidak perlu restart apa pun.

---

## Jika perubahan tidak muncul

| Gejala | Penyebab | Solusi |
|---|---|---|
| Tampilan masih lama | Cache browser | `Ctrl+Shift+R` |
| Tampilan masih lama | Web server menyajikan folder lain | Cek `root` di nginx / `DocumentRoot` di apache |
| Data anime / login kosong | `.env` tidak terbaca saat build | Isi `.env`, lalu build ulang |
| 404 saat refresh halaman | Fallback `index.html` belum diatur | Ulangi langkah 5 |
| Video 404 di vidhide / desustream / filedon | API belum di-update | Update API (lihat `DEPLOY.md` di repo `nganime-api`) |
| `npm install` gagal | Versi Node terlalu lama | Pakai Node 20+ |

## Catatan

- Jangan menjalankan `npm run web` di server untuk produksi. Itu server development
  (`expo start`) dan tidak untuk dilayani ke publik.
- Setelah mengganti URL API di `.env`, **wajib build ulang**; mengganti `.env` saja tidak cukup.
