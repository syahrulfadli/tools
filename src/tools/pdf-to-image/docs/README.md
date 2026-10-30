# PDF ke Gambar

Rute: `/tools/pdf-ke-gambar` · Kategori: File Converter (`file-converter`) · Definisi: `src/tools/pdf-to-image/index.tsx`

## Fungsi

Mengubah halaman PDF menjadi gambar **JPEG atau PNG**, satu file per halaman. Bisa memilih halaman, resolusi (72 / 150 / 300 dpi), format, dan kualitas JPEG. Satu halaman diunduh sebagai `.jpg`/`.png`; lebih dari satu diunduh sebagai `.zip`. (Dulu bernama "PDF ke JPEG" di `/tools/pdf-ke-jpg`.) PDF dibuka dengan pdf.js di browser dan tidak pernah dikirim ke server.

## Cara pakai

1. **Buka PDF:** klik area kosong atau "Pilih PDF", seret file ke halaman, atau tempel (Ctrl/⌘+V). Satu PDF sekaligus; file tambahan dan non-PDF dilaporkan di panel Dokumen.
2. **PDF dengan kata sandi:** muncul form kata sandi. Sandi hanya dipakai di browser.
3. **Pilih halaman:** semua halaman terpilih saat dibuka. Klik thumbnail untuk memilih/melepas, Shift+klik untuk satu rentang, atau ketik di "Nomor halaman" (`1-3, 8`), lalu Enter. Ada tombol "Pilih semua" dan "Kosongkan".
4. **Resolusi:** 72 dpi (layar), 150 dpi (bawaan, berbagi), 300 dpi (cetak). Ukuran piksel halaman 1 tampil di kepala seksi.
5. **Format gambar:** JPEG (bawaan; kualitas 50–100%, bawaan 90%) atau PNG (lossless: teks tajam, file lebih besar).
6. **Unduh:** tombol utama. Selama konversi tombol menunjukkan progres (`3/12`) dan muncul tombol "Batal".

## Struktur file

| File | Isi |
| --- | --- |
| `index.tsx` | `ToolDefinition`; skeleton memakai `ConverterSkeleton` bersama. |
| `PdfToImageTool.tsx` | Komponen utama: siklus dokumen, thumbnail, pilihan halaman, konversi, unduhan. |
| `Preview.tsx` | SVG mini untuk home. |
| `pdf-to-image.css` | Form sandi, kisi halaman. Kartu dokumen memakai `.doc-card` bersama di `styles/tool.css`. |
| `lib/pdf.ts` | Pembungkus pdf.js: `openPdf`, `pageSize`, `pageToImage`, `pageThumbnail`, `PdfPasswordError`. |
| `lib/pages.ts` | `parsePageRanges`, `formatPageRanges`, `pageFilename` (+ test). |

Dipakai bersama: `components/tool/*` (bar, panel, kontrol, input file), `lib/zip.ts`, `lib/files.ts`, `lib/canvas.ts`.

## Alur penting

- **Status dokumen** (`Doc`): `empty → opening → ready`, atau `password` / `error`. Membuka PDF baru menutup dokumen lama (`pdf.destroy()`), dan hasil pembukaan yang usang dibuang lewat `openToken`.
- **Sandi:** `openPdf` menolak dengan `PdfPasswordError(incorrect)` dari callback `onPassword` pdf.js (callback itu harus menolak promise sendiri; jika tidak, pdf.js menunggu selamanya).
- **Thumbnail:** dibuat berurutan di latar (lebar 240 px, JPEG 80%) setelah dokumen siap; progres tampil di kepala area kerja. Object URL dilepas saat dokumen diganti.
- **Konversi:** halaman terpilih dirender berurutan ke kanvas berlatar putih, `toBlob("image/jpeg" | "image/png")`, lalu dibungkus ZIP (`createZip`, tanpa kompresi). Nama file: `<nama-pdf>-hal-<n>.jpg|png`, ZIP `<nama-pdf>-jpg|png.zip` dengan nol di depan sesuai jumlah halaman.
- **Batas kanvas:** halaman sangat besar diturunkan resolusinya oleh `canvasLimitFactor` (maks. 16,7 juta piksel) dan catatan muncul di seksi Resolusi.

## Konfigurasi pdf.js

- Versi dikunci di `pdfjs-dist@4.10.38` (sudah termasuk perbaikan CVE-2024-4367). Tetap pakai `isEvalSupported: false`.
- Worker: `pdfjs-dist/build/pdf.worker.min.mjs?url`, dilayani dari `/assets/` (CSP `script-src 'self'`).
- `cmaps/` dan `standard_fonts/` disalin ke `public/vendor/pdfjs/` oleh `scripts/copy-pdfjs-assets.mjs` (jalan otomatis di `predev`/`prebuild`; folder diabaikan git).
- `useSystemFonts: false`: font standar PDF (Helvetica, Times, …) selalu memakai font bawaan pdf.js. Dengan font sistem, jarak huruf meleset karena metriknya berbeda (ditemukan saat pengujian).
- CSP `font-src` harus memuat `'self'` agar font dari `/vendor/pdfjs/` tidak diblokir.
- Chunk tool ini ±350 KB (pdf.js) + worker ±1,4 MB, hanya dimuat saat tool dibuka.

## Batasan

- Satu PDF per sesi.
- Formulir XFA tidak dirender (`enableXfa: false`).
- Semua JPEG ditahan di memori sampai ZIP selesai; ratusan halaman 300 dpi bisa berat di ponsel.

## Ide pengembangan

- Rentang cepat: "halaman ganjil/genap".
- Banyak PDF sekaligus, satu folder per PDF di dalam ZIP.
