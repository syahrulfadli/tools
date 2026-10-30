# Pisah PDF

Rute: `/tools/pisah-pdf` · Kategori: Olah PDF (`pdf-tools`) · Definisi: `src/tools/split-pdf/index.tsx`

## Fungsi

Mengambil halaman dari satu PDF atau membaginya jadi beberapa PDF. Semua proses di browser; PDF tidak pernah dikirim ke server. Halaman disalin apa adanya (pdf-lib `copyPages`), jadi teks tetap bisa dipilih.

| Cara | Hasil |
| --- | --- |
| **Pilih** (bawaan) | Satu PDF berisi halaman yang dipilih (klik, Shift+klik rentang, atau ketik "1-3, 8"). Urutan halaman mengikuti dokumen asal. |
| **Rentang** | Tiap rentang yang dipisah koma jadi satu PDF: "1-3, 4-6, 9" → tiga PDF. Boleh tumpang tindih; halaman yang tak disebut dilewati. |
| **Per n** | Bagi tiap *n* halaman; sisa di akhir jadi PDF terakhir. n = 1 menghasilkan satu PDF per halaman. |

Satu hasil diunduh sebagai `<nama>-hal-<halaman>.pdf` (mis. `laporan-hal-1-3_8.pdf`); banyak hasil dikemas `<nama>-pisah.zip`. Untuk **menghapus** halaman, pilih halaman yang dipertahankan.

## Cara pakai

1. Pilih PDF (tombol, seret, atau tempel). Kisi halaman muncul dengan pratinjau.
2. Pilih cara memisah dan atur halamannya. Di mode Rentang/Per n, tiap halaman diberi label "PDF n" atau "dilewati".
3. Klik tombol unduh.

## Struktur file

| File | Isi |
| --- | --- |
| `index.tsx` | `ToolDefinition`; skeleton memakai `ConverterSkeleton`. |
| `SplitPdfTool.tsx` | Komponen utama: pembukaan PDF, mode, kisi halaman, unduhan. |
| `Preview.tsx`, `split-pdf.css` | SVG mini untuk home; gaya kisi saat hanya pratinjau. |
| `lib/plan.ts` | Murni: `planRanges`, `planEvery`, `partName` (+ test). |

Memakai `parsePageRanges`/`formatPageRanges` dan gaya kisi halaman (`pdf-to-image.css`), `openPdf`/`pageThumbnail` dari `pdf-to-image/lib/`, dan `extractParts` di `src/lib/pdf-edit.ts` (ada test).

## Alur penting

- **Membuka:** pdf-lib memuat PDF lebih dulu (menentukan jumlah halaman dan menolak yang terenkripsi/rusak), lalu pdf.js dibuka hanya untuk thumbnail. Bila pdf.js gagal, pemisahan tetap jalan tanpa pratinjau.
- **Rencana** (`plan`) dihitung dari mode aktif; tombol unduh mati selama rencana tidak sah, dan pesan galat tampil di bawah kolom input.
- **Memisah:** PDF sumber dimuat sekali, tiap kelompok disalin ke dokumen baru dengan progres "Memisah PDF n dari m".

## Batasan

- PDF berkata sandi ditolak (tidak ada form sandi seperti PDF ke Gambar).
- Bookmark, form interaktif, dan metadata dokumen asal tidak ikut terbawa.
- Ukuran file hasil bisa mendekati file asal bila halaman berbagi sumber daya besar (font/gambar), karena sumber daya yang dipakai disalin ke tiap PDF.

## Ide pengembangan

- Memisah menurut bookmark.
- Mengurutkan ulang dan memutar halaman.
- Form sandi untuk PDF terenkripsi.
