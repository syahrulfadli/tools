# QR Code

Rute: `/tools/qr-code` · Kategori: File Converter (`file-converter`) · Definisi: `src/tools/qr-code/index.tsx`

## Fungsi

Mengubah link atau teks bebas menjadi QR code, lalu mengunduhnya sebagai PNG atau SVG, atau menyalin gambarnya ke clipboard. QR dibuat di browser; isinya tidak dikirim ke mana pun.

## Cara pakai

1. **Isi**: pilih **Link** atau **Teks**.
   - Link: domain polos boleh (`contoh.com/promo` → `https://contoh.com/promo`). Skema lain (`mailto:`, `tel:`, `WIFI:`) dipertahankan. Link berspasi atau tanpa domain ditolak.
   - Teks: apa saja, termasuk huruf beraksen dan emoji (dikodekan UTF-8). Jumlah byte tampil di judul seksi.
2. **Ketahanan** (koreksi kesalahan): Rendah 7%, Sedang 15% (bawaan), Tinggi 25%, Maks. 30%. Makin tinggi, makin tahan rusak tapi kotaknya makin rapat dan kapasitasnya makin kecil.
3. **Warna**: kotak Hitam/Teal/Lainnya, latar Putih/Transparan/Lainnya. Ada peringatan bila kontras terlalu rendah atau kotak lebih terang dari latar.
4. **Unduhan**: ukuran PNG 512/1024/2048 px (dibulatkan agar tiap kotak berukuran piksel bulat; ukuran sebenarnya tampil di judul seksi). **Tepi kosong** (bawaan menyala) memberi bingkai 4 kotak yang dibutuhkan pemindai.
5. **Unduh PNG**, **SVG**, atau **Salin gambar**. Nama file diambil dari isi, mis. `qr-contoh-com-promo.png`.

## Struktur file

| File | Isi |
| --- | --- |
| `index.tsx` | `ToolDefinition` + skeleton (`ConverterSkeleton`). |
| `QrCodeTool.tsx` | Halaman: isi, opsi, pratinjau SVG, unduh PNG/SVG, salin. |
| `Preview.tsx` | SVG mini untuk home (pola tetap, bukan QR asli). |
| `qr-code.css` | Kotak isi, pratinjau di tengah area kerja. |
| `lib/qr.ts` | Pembungkus qrcode-generator (UTF-8), path SVG, file SVG, piksel per modul, normalisasi link, nama file, peringatan warna. |
| `lib/qr.test.ts` | Test matriks, kapasitas, SVG, link, nama file, warna. |

## Model data

```ts
QrMatrix { size /* modul per sisi */, version /* 1–40 */, modules: boolean[][] }
QrStyle  { margin /* modul */, foreground /* "#rrggbb" */, background /* "#rrggbb" | "transparent" */ }
```

## Alur penting

- **Encoder**: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT, tanpa dependensi) memilih versi terkecil yang muat (`typeNumber 0`). Bawaannya memotong tiap karakter ke 1 byte, jadi `qrcode.stringToBytes` diganti `TextEncoder` (UTF-8). Hasilnya sudah dicek bisa dibaca pembaca independen (jsQR) untuk teks ASCII, UTF-8, dan isi 1.200 byte.
- **Gambar sendiri**: pustaka hanya dipakai untuk matriks. SVG digambar sebagai satu `<path>` dengan modul berurutan per baris digabung (`qrPath`); PNG digambar di kanvas dengan piksel per modul yang bulat agar tepi tajam.
- **Salin gambar**: `ClipboardItem` diberi promise PNG, sehingga izin clipboard tetap terikat ke klik user (syarat Safari).
- **Kapasitas** dicek sebelum encode (`MAX_BYTES`, versi 40 mode byte) agar pesan galat jelas.

## Batasan

- Hanya mode byte; teks angka murni tidak memakai mode numerik yang lebih padat.
- Tidak ada logo di tengah. Bila menimpa logo sendiri, pakai ketahanan Maks. dan uji pindai.
- Isi QR tidak disimpan; me-reload tab mengosongkannya.

## Ide pengembangan

- Template isi: WiFi (`WIFI:T:WPA;S:…;P:…;;`), kontak (vCard), WhatsApp, email.
- Pindai QR dari gambar (kebalikan tool ini).
