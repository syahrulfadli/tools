# Kompres PDF

Rute: `/tools/kompres-pdf` · Kategori: Kompres (`compressor`) · Definisi: `src/tools/compress-pdf/index.tsx`

## Fungsi

Memperkecil ukuran banyak PDF sekaligus dengan dua cara. Semua proses di browser; PDF tidak pernah dikirim ke server.

| Cara | Yang terjadi | Teks | Cocok untuk |
| --- | --- | --- | --- |
| **Kompres gambar** (bawaan) | Gambar JPEG di dalam PDF diperkecil dan di-encode ulang; sisanya tidak disentuh. | Tetap bisa dipilih dan dicari | PDF berisi foto, atau hasil scan yang disimpan sebagai JPEG |
| **Ratakan jadi gambar** | Tiap halaman dirender (pdf.js) jadi satu JPEG lalu disusun jadi PDF baru. | Hilang (jadi gambar) | Scan yang besar dan tidak perlu dicari; ukuran paling kecil |

Tiga tingkat (`lib/levels.ts`): Tinggi, Seimbang (bawaan), Terkecil.

| Tingkat | Cara gambar: sisi maks. / kualitas | Cara ratakan: dpi / kualitas |
| --- | --- | --- |
| Tinggi | 2.400 px / 85% | 150 / 80% |
| Seimbang | 1.600 px / 72% | 110 / 65% |
| Terkecil | 1.000 px / 55% | 72 / 50% |

## Cara pakai

1. Tambah PDF (tombol, seret, atau tempel). Bisa banyak; diproses satu per satu.
2. Pilih cara dan tingkat. Mengubahnya mengompres ulang semua PDF.
3. Lihat ukuran sebelum/sesudah per file dan total, lalu unduh (satu file → `<nama>-kompres.pdf`, banyak → `.zip`).

## Struktur file

| File | Isi |
| --- | --- |
| `index.tsx` | `ToolDefinition`; skeleton memakai `ConverterSkeleton`. |
| `CompressPdfTool.tsx` | Komponen utama: daftar PDF, antrean, progres per file, ringkasan, unduhan. |
| `Preview.tsx`, `compress-pdf.css` | SVG mini untuk home; ikon dokumen dan progres di baris daftar. |
| `lib/levels.ts` | Preset tingkat dan tipe `Mode`/`Level`. |
| `lib/recompress.ts` | Mode gambar: pdf-lib mencari gambar JPEG dan menggantinya lewat `encode` yang disuntikkan (+ test). |
| `lib/images.ts` | `canvasEncoder` (kanvas browser) dan `reducedSize`. |
| `lib/compress.ts` | `compressPdf` (memilih mode, menjaga hasil tidak lebih besar), `isPdf`, `outputName`. |

Memakai `openPdf`, `pageToImage`, `pageSizePt` dari `pdf-to-image/lib/pdf.ts`, `buildPdf` dari `image-to-pdf/lib/pdf-writer.ts`, dan gaya daftar `.convert-list` dari `styles/tool.css`. Library `pdf-lib` hanya diimpor dari tool ini, jadi masuk chunk tool.

## Alur penting

- **Mode gambar:** `PDFDocument.load` lalu menelusuri semua objek tidak langsung. Gambar diganti hanya bila `Subtype=Image`, satu filter `DCTDecode`, ruang warna DeviceRGB/DeviceGray/ICCBased (1 atau 3 kanal), tanpa `Decode`, `Mask`, atau `ImageMask`, dan ≥ 10 KB. Hasil dipakai bila ≥ 10% lebih kecil. Gambar baru selalu DeviceRGB; `SMask` dibiarkan (PDF memperbolehkan ukuran berbeda). Disimpan dengan object stream, tanpa mengubah metadata.
- **Orientasi:** JPEG di PDF di-decode dengan `imageOrientation: "none"` karena penampil PDF mengabaikan EXIF.
- **Mode ratakan:** ukuran halaman dalam poin dari pdf.js, gambar di-render pada dpi preset (dibatasi `canvasLimitFactor`), halaman PDF baru berukuran sama; tautan, bookmark, dan teks hilang.
- **Tidak pernah lebih besar:** bila hasil tidak lebih kecil dari file asli, file asli dipakai dan baris diberi keterangan "sudah optimal".
- **Progres:** baris yang sedang diproses menampilkan "Memproses n dari m…" (gambar atau halaman). Menghapus baris saat mode ratakan berjalan menghentikannya.

## Batasan

- PDF berkata sandi/terenkripsi ditolak dengan pesan jelas.
- Mode gambar hanya mengenali gambar JPEG. PDF yang gambarnya berformat lain (Flate/PNG, JBIG2, JPEG 2000), atau yang isinya teks dan vektor saja, tidak mengecil; pakai mode ratakan bila teks tidak perlu dipilih.
- Mode gambar tidak menghapus font tersemat, objek tak terpakai, atau metadata besar.
- Hasil terbatas memori tab; PDF ratusan MB dapat gagal di perangkat mobile.

## Ide pengembangan

- Mengompres gambar Flate (butuh decode predictor PNG).
- Subset font dan pembersihan objek.
- Dukungan PDF berkata sandi (form sandi seperti PDF ke Gambar).
