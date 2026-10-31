# QR Code

Rute: `/tools/qr-code` · Kategori: File Converter (`file-converter`) · Definisi: `src/tools/qr-code/index.tsx`

## Fungsi

Mengubah link atau teks bebas menjadi QR code, lalu mengunduhnya sebagai PNG atau SVG, atau menyalin gambarnya ke clipboard. QR dibuat di browser; isinya tidak dikirim ke mana pun.

## Cara pakai

1. **Isi**: pilih **Link** atau **Teks**.
   - Link: domain polos boleh (`contoh.com/promo` → `https://contoh.com/promo`). Skema lain (`mailto:`, `tel:`, `WIFI:`) dipertahankan. Link berspasi atau tanpa domain ditolak.
   - Teks: apa saja, termasuk huruf beraksen dan emoji (dikodekan UTF-8). Jumlah byte tampil di judul seksi.
2. **Ketahanan** (koreksi kesalahan): Rendah 7%, Sedang 15% (bawaan), Tinggi 25%, Maks. 30%. Makin tinggi, makin tahan rusak tapi kotaknya makin rapat dan kapasitasnya makin kecil.
3. **Logo** (opsional): **Tambah logo di tengah** menerima PNG, JPEG, WebP, atau SVG. Saat logo dipasang, ketahanan otomatis naik ke Maks. **Ukuran logo** dimulai dari 10% lebar QR, batas atasnya mengikuti ketahanan: Sedang 16%, Tinggi 22%, Maks. 25%. Di tingkat Rendah logo tidak dipasang dan ada pesan untuk menaikkan ketahanan. Keterangan di bawah slider menyebut berapa persen kotak QR yang tertutup.
4. **Warna**: kotak Hitam/Teal/Lainnya, latar Putih/Transparan/Lainnya. Ada peringatan bila kontras terlalu rendah atau kotak lebih terang dari latar.
5. **Unduhan**: ukuran PNG 512/1024/2048 px (dibulatkan agar tiap kotak berukuran piksel bulat; ukuran sebenarnya tampil di judul seksi). **Tepi kosong** (bawaan menyala) memberi bingkai 4 kotak yang dibutuhkan pemindai.
6. **Unduh PNG**, **SVG**, atau **Salin gambar**. Nama file diambil dari isi, mis. `qr-contoh-com-promo.png`. Logo ikut di ketiganya; di SVG logo disematkan sebagai data URL PNG, jadi file SVG tetap mandiri.

## Struktur file

| File             | Isi                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `index.tsx`      | `ToolDefinition` + skeleton (`ConverterSkeleton`).                                                                        |
| `QrCodeTool.tsx` | Halaman: isi, opsi, pratinjau SVG, unduh PNG/SVG, salin.                                                                  |
| `Preview.tsx`    | SVG mini untuk home (pola tetap, bukan QR asli).                                                                          |
| `qr-code.css`    | Kotak isi, pratinjau di tengah area kerja.                                                                                |
| `lib/qr.ts`      | Pembungkus qrcode-generator (UTF-8), path SVG, file SVG, piksel per modul, normalisasi link, nama file, peringatan warna, kotak logo (`logoBox`, `logoImageRect`, `logoCoverage`, `LOGO_MAX_SCALE`). |
| `lib/logo.ts` | `loadLogo`: baca file logo, kecilkan ke PNG maks. 512 px (data URL), siapkan gambar untuk kanvas. |
| `lib/qr.test.ts` | Test matriks, kapasitas, SVG, link, nama file, warna, geometri logo.                                                                     |

## Model data

```ts
QrMatrix { size /* modul per sisi */, version /* 1–40 */, modules: boolean[][] }
LogoBox  { x, y, size } // satuan modul, termasuk tepi kosong
Logo     { name, href /* data URL PNG */, aspect, image }
QrStyle  { margin /* modul */, foreground /* "#rrggbb" */, background /* "#rrggbb" | "transparent" */ }
```

## Alur penting

- **Encoder**: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT, tanpa dependensi) memilih versi terkecil yang muat (`typeNumber 0`). Bawaannya memotong tiap karakter ke 1 byte, jadi `qrcode.stringToBytes` diganti `TextEncoder` (UTF-8). Hasilnya sudah dicek bisa dibaca pembaca independen (jsQR) untuk teks ASCII, UTF-8, dan isi 1.200 byte.
- **Gambar sendiri**: pustaka hanya dipakai untuk matriks. SVG digambar sebagai satu `<path>` dengan modul berurutan per baris digabung (`qrPath`); PNG digambar di kanvas dengan piksel per modul yang bulat agar tepi tajam.
- **Salin gambar**: `ClipboardItem` diberi promise PNG, sehingga izin clipboard tetap terikat ke klik user (syarat Safari).
- **Logo**: kotak logo berpusat dan sejajar grid modul (lebar dibulatkan ke modul utuh dengan paritas yang sama dengan jumlah modul). Modul di dalam kotak tidak digambar, dan logo diletakkan di dalamnya dengan jarak 1 modul serta rasio asli. Modul yang hilang dipulihkan oleh koreksi kesalahan, jadi batas ukurannya bergantung pada tingkat ketahanan.
- **Batas ukuran logo** dari uji pindai jsQR: logo hitam pekat (kasus terburuk), 4 ukuran piksel per modul, isi 12–300 byte. Semua masih terbaca sampai 22% (Sedang), 28% (Tinggi), dan 28% (Maks.). Batas di UI diberi cadangan (16/22/25%) untuk kamera ponsel dan cetakan. PNG hasil unduhan dengan logo di batas maksimum tiap tingkat sudah dicek terbaca.
- **Kapasitas** dicek sebelum encode (`MAX_BYTES`, versi 40 mode byte) agar pesan galat jelas.

## Batasan

- Hanya mode byte; teks angka murni tidak memakai mode numerik yang lebih padat.
- Logo hanya di tengah dan hanya satu. Batas ukurannya hasil uji dengan satu pembaca (jsQR), jadi tetap uji pindai dengan kamera ponsel sebelum dicetak.
- Logo tidak disimpan; me-reload tab menghapusnya.
- Isi QR tidak disimpan; me-reload tab mengosongkannya.

## Ide pengembangan

- Template isi: WiFi (`WIFI:T:WPA;S:…;P:…;;`), kontak (vCard), WhatsApp, email.
- Pindai QR dari gambar (kebalikan tool ini).
