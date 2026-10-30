# Gambar ke PDF

Rute: `/tools/gambar-ke-pdf` · Kategori: File Converter (`file-converter`) · Definisi: `src/tools/image-to-pdf/index.tsx`

## Fungsi

Menggabungkan gambar (JPEG, PNG, WebP, GIF, BMP, AVIF) menjadi satu PDF, satu gambar per halaman. Satu tool untuk JPEG ke PDF maupun PNG ke PDF. PDF ditulis sendiri di browser tanpa library dan tanpa mengunggah file.

## Cara pakai

1. **Tambah gambar:** tombol, area kosong, seret ke halaman, atau tempel (Ctrl/⌘+V).
2. **Atur halaman:** seret kartu untuk mengubah urutan, atau pakai tombol ←/→. Putar 90° kiri/kanan, hapus.
3. **Ukuran kertas:** Sesuai gambar (halaman seukuran gambar pada 96 dpi), A4, F4 (215×330 mm), Letter, Legal, A5.
4. **Tata letak:** orientasi Otomatis (gambar lebar → lanskap), Potret, atau Lanskap; margin Tanpa / 5 / 10 / 20 mm. Gambar selalu dimuat utuh di area dalam margin dan diletakkan di tengah.
5. **Ukuran file:** Asli (bawaan), Seimbang (maks. 2.480 px, JPEG 85%), Kecil (maks. 1.600 px, JPEG 70%).
6. **Nama file**, lalu **Buat PDF**. Progres per halaman tampil di tombol dan bar.

Pratinjau di area kerja memakai tata letak yang sama dengan PDF: kertas, margin, letak, dan putaran yang terlihat adalah hasilnya.

## Struktur file

| File | Isi |
| --- | --- |
| `index.tsx` | `ToolDefinition`; skeleton `ConverterSkeleton`. |
| `ImageToPdfTool.tsx` | Halaman: daftar gambar, urutan (drag & tombol), putar, pengaturan, pembuatan PDF. |
| `Preview.tsx` | SVG mini untuk home. |
| `image-to-pdf.css` | Kisi kartu halaman (bingkai persegi berisi kertas). |
| `lib/jpeg.ts` | `parseJpeg`: ukuran tersimpan, jumlah kanal, orientasi EXIF dari header JPEG. |
| `lib/layout.ts` | `PAGE_SIZES`, `pageLayout`, `rotatedSize`, `imageMatrix` (matriks `cm` untuk 8 orientasi EXIF × 4 putaran). |
| `lib/pdf-writer.ts` | `buildPdf` (PDF 1.4, satu gambar per halaman), `deflate` (CompressionStream). |
| `lib/build.ts` | `loadSource` (thumbnail, info JPEG), `createPdf` (pipeline per mode kualitas), `layoutFor`. |
| `lib/*.test.ts` | Test parser JPEG, tata letak, matriks orientasi, dan PDF yang dibaca ulang dengan pdf.js. |

## Alur penting

- **JPEG lossless:** di mode Asli, byte JPEG dimasukkan langsung sebagai `/DCTDecode` (tidak di-decode/encode ulang), jadi kualitas sama dan ukuran PDF ≈ jumlah ukuran foto. Hanya JPEG abu-abu/RGB; JPEG CMYK di-encode ulang lewat jalur piksel.
- **Orientasi tanpa memutar piksel:** foto ponsel sering tersimpan "rebah" dengan tag EXIF Orientation. `parseJpeg` membaca tag itu, dan `imageMatrix` menggabungkan orientasi EXIF dengan putaran pengguna menjadi matriks `cm` PDF. Test memeriksa ke mana sudut kiri atas gambar mendarat untuk setiap kombinasi.
- **Gambar non-JPEG** (mode Asli): di-decode lewat `createImageBitmap` (EXIF sudah diterapkan), piksel RGB dikompres Flate, dan alfa menjadi `/SMask` bila ada piksel transparan.
- **Mode Seimbang/Kecil:** semua gambar diperkecil lalu di-encode JPEG di kanvas berlatar putih; orientasi sudah tegak (matriks hanya untuk putaran pengguna).
- **Tata letak:** `pageLayout` menghitung kertas + kotak gambar (y dari atas) untuk pratinjau; `imageMatrix` membaliknya ke koordinat PDF (y dari bawah).
- **Memori:** thumbnail (maks. 360 px, PNG) disimpan sebagai object URL dan dilepas saat gambar dihapus/mulai ulang/tool ditutup; file asli dibaca lagi saat PDF dibuat. Halaman diproses berurutan.

## Batasan

- Satu gambar per halaman (belum ada beberapa gambar dalam satu halaman).
- GIF animasi hanya bingkai pertama. HEIC tidak didukung.
- Profil warna ICC tidak dibawa; gambar dianggap sRGB.
- "Sesuai gambar" dibatasi ukuran halaman maks. PDF (200 inci).

## Ide pengembangan

- Beberapa gambar per halaman (2 atau 4 per A4) untuk cetak hemat kertas.
- Mode "Penuhi halaman" (dipotong) selain "Muat utuh".
- Urutkan otomatis berdasarkan nama file.
