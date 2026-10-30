# Gabung PDF

Rute: `/tools/gabung-pdf` · Kategori: Olah PDF (`pdf-tools`) · Definisi: `src/tools/merge-pdf/index.tsx`

## Fungsi

Menggabung beberapa PDF jadi satu, sesuai urutan daftar. Semua proses di browser; PDF tidak pernah dikirim ke server. Halaman disalin apa adanya (pdf-lib `copyPages`), jadi teks tetap bisa dipilih dan gambar tidak dikompres ulang.

## Cara pakai

1. Tambah PDF (tombol, seret ke halaman, atau tempel). Bisa banyak, bisa ditambah lagi kapan saja.
2. Atur urutan dengan panah naik/turun di tiap baris; hapus yang tidak perlu.
3. Klik **Gabung n PDF**. Hasil diunduh sebagai `gabungan-<stempel waktu>.pdf`.

Tombol aktif bila ada minimal dua PDF valid dan semuanya sudah selesai diperiksa.

## Struktur file

| File | Isi |
| --- | --- |
| `index.tsx` | `ToolDefinition`; skeleton memakai `ConverterSkeleton`. |
| `MergePdfTool.tsx` | Komponen utama: daftar berurutan, pemeriksaan PDF, ringkasan, unduhan. |
| `Preview.tsx`, `merge-pdf.css` | SVG mini untuk home; gaya thumbnail baris. |
| `lib/order.ts` | `moveItem` untuk memindah baris (+ test). |

Penggabungan sendiri ada di `src/lib/pdf-edit.ts` (`mergePdfs`, dipakai bersama Pisah PDF; ada test). `pdf-lib` hanya diimpor lewat tool, jadi masuk chunk tool.

## Alur penting

- **Pemeriksaan:** tiap PDF baru dimuat dengan pdf-lib (jumlah halaman; menolak PDF terenkripsi atau rusak per baris) lalu halaman 1 dirender pdf.js jadi thumbnail. Dilakukan satu per satu lewat antrean; baris yang dihapus sebelum gilirannya dilewati. Gagal membuat thumbnail tidak menggagalkan baris.
- **Penggabungan:** file dibaca satu per satu (hemat memori); galat menyebut nama file bermasalah.
- **Object URL** thumbnail dilepas saat baris dihapus, "Mulai ulang", atau tool ditutup.

## Batasan

- PDF berkata sandi ditolak.
- Bookmark/outline, form interaktif, dan metadata dokumen asal tidak ikut terbawa; hanya isi halaman (termasuk tautan dan anotasi di dalam halaman).
- Hasil terbatas memori tab; total ratusan MB dapat gagal di perangkat mobile.

## Ide pengembangan

- Seret-dan-lepas untuk mengurutkan.
- Memilih sebagian halaman tiap file sebelum digabung.
- Membawa bookmark dan memberi judul dokumen.
