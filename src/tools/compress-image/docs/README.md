# Kompres Gambar

Rute: `/tools/kompres-gambar` · Kategori: Kompres (`compressor`) · Definisi: `src/tools/compress-image/index.tsx`

## Fungsi

Memperkecil ukuran file banyak gambar sekaligus: format hasil dipilih (WebP, JPEG, PNG), kualitas diatur, dan sisi terpanjang bisa dibatasi. Ukuran sebelum/sesudah dan persen selisih tampil per gambar dan total. Semua proses di browser; gambar tidak pernah dikirim ke server.

## Cara pakai

1. **Tambah gambar:** tombol, area kosong, seret ke halaman, atau tempel (Ctrl/⌘+V). JPEG, PNG, WebP, GIF (bingkai pertama), BMP, AVIF.
2. **Format:** WebP (bawaan; disembunyikan bila browser tidak bisa meng-encode WebP), JPEG (area transparan jadi putih), atau PNG (lossless, hanya mengecil bila piksel diperkecil).
3. **Kualitas:** 30–100% (bawaan 75%). Tidak berlaku untuk PNG.
4. **Ukuran:** sisi terpanjang maksimum Asli / 2.560 / 1.920 / 1.280 px. Gambar tidak pernah diperbesar.
5. **Unduh:** per baris, atau semua lewat tombol utama (satu file → langsung, banyak → `.zip`). Nama hasil `<nama>-kompres.<ext>`.

Setiap perubahan pengaturan mengompres ulang semua gambar otomatis (slider ditunda 250 ms).

## Struktur file

| File | Isi |
| --- | --- |
| `index.tsx` | `ToolDefinition`; skeleton memakai `ConverterSkeleton`. |
| `CompressImageTool.tsx` | Komponen utama; strukturnya sama dengan PNG ke JPEG (antrean satu gambar per putaran, hasil dengan `key` opsi). |
| `Preview.tsx` | SVG mini untuk home. |
| `lib/compress.ts` | `compressImage`, `outputName`, `shouldKeepOriginal`, `supportsWebpEncode` (+ test). |

Memakai `decode`, `targetSize`, `sizeChange`, `ACCEPTED_TYPES` dari `../png-to-jpg/lib/convert`, dan gaya daftar `.convert-list` dari `styles/tool.css`.

## Alur penting

- **Tidak pernah lebih besar:** bila hasil tidak lebih kecil dari file asli, formatnya sama, dan piksel tidak berubah (`shouldKeepOriginal`), file asli dipakai apa adanya dan baris diberi keterangan "sudah optimal". Nama hasilnya tetap `-kompres` dengan ekstensi asli.
- **WebP:** `supportsWebpEncode()` memeriksa `toDataURL("image/webp")` sekali saat modul dimuat, karena `toBlob` pada browser tanpa dukungan diam-diam memberi PNG.
- **Memori:** `bitmap.close()` dan `URL.revokeObjectURL` saat gambar dihapus, mulai ulang, atau tool ditutup.

## Batasan

- Metadata (EXIF, profil warna) tidak dibawa ke hasil; orientasi EXIF sudah diterapkan ke piksel.
- GIF animasi hanya bingkai pertama. HEIC tidak didukung.
- Tidak ada target ukuran file ("maks. 500 KB").

## Ide pengembangan

- Target ukuran file dengan pencarian kualitas otomatis (biner).
- Pratinjau sebelum/sesudah berdampingan.
