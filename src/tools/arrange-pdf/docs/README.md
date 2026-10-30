# Atur Halaman PDF

Rute: `/tools/atur-halaman-pdf` · Kategori: Olah PDF (`pdf-tools`) · Definisi: `src/tools/arrange-pdf/index.tsx`

## Fungsi

Menyusun ulang satu PDF: ubah urutan halaman, hapus halaman, dan putar halaman 90°. Hasilnya satu PDF baru. Semua diproses di browser; PDF tidak diunggah.

## Cara pakai

1. Pilih, seret, atau tempel (Ctrl+V) satu PDF.
2. Di kisi halaman:
   - **Seret** kartu halaman ke posisi baru (desktop). Di layar sentuh atau dengan keyboard, pakai tombol panah kiri/kanan di bawah kartu.
   - **Putar** (ikon panah melingkar) menambah 90° searah jarum jam. Empat kali kembali tegak.
   - **Hapus** (ikon tempat sampah) menandai halaman sebagai dihapus. Kartu tetap tampil redup dengan label "Dihapus" dan bisa dikembalikan.
3. Panel kiri:
   - **Hapus halaman**: ketik nomor halaman asal (`2, 5-7`) lalu Hapus.
   - **Semua halaman**: Putar semua, Balik urutan, Kembalikan semula.
   - **Hasil**: jumlah halaman hasil, dihapus, diputar, dan apakah urutan berubah.
4. **Unduh PDF** → `<nama>-diatur.pdf`. Tombol nonaktif bila belum ada perubahan atau semua halaman dihapus.

Label kartu: "Hal. 3" = nomor di PDF asal; "ke-1" = posisinya di PDF hasil.

## Struktur file

| File                  | Isi                                                                            |
| --------------------- | ------------------------------------------------------------------------------ |
| `index.tsx`           | `ToolDefinition` + skeleton (`ConverterSkeleton`).                             |
| `ArrangePdfTool.tsx`  | Halaman: panel, kisi kartu, seret-urutkan, unduh.                              |
| `Preview.tsx`         | SVG mini untuk home.                                                           |
| `arrange-pdf.css`     | Kisi kartu, kotak persegi tempat halaman diputar, penanda target seret.        |
| `lib/arrange.ts`      | Fungsi murni susunan halaman (pindah, putar, hapus, rencana hasil, ringkasan). |
| `lib/arrange.test.ts` | Test susunan halaman.                                                          |

Bahan bersama yang dipakai: `usePdfDocument`, `usePdfThumbnails`, `useSinglePdfInput` (`src/components/tool/usePdfDocument.ts`), `PdfDocumentCard`, `PdfWorkspaceState` (`src/components/tool/PdfDocument.tsx`), `rearrangePdf` (`src/lib/pdf-edit.ts`).

## Model data

```ts
PageItem { source: number /* nomor halaman asal, mulai 1 */, rotate: 0 | 90 | 180 | 270, deleted: boolean }
```

Daftar `PageItem[]` mengikuti urutan hasil. `outputPlan` membuang yang `deleted` dan menghasilkan `{ page, rotate }[]` untuk `rearrangePdf`.

## Alur penting

- **Validasi dengan pdf-lib**: PDF dibuka pdf-lib dulu (menolak yang terenkripsi/rusak dan memberi ukuran serta rotasi tiap halaman); pdf.js hanya membuat thumbnail. Bila pdf.js gagal, kartu tampil sebagai balok abu dan tool tetap bisa dipakai.
- **Rotasi**: `rearrangePdf` menyalin halaman ke dokumen baru lalu `setRotation(rotasi asal + tambahan)`. Isi halaman tidak digambar ulang, jadi teks tetap bisa dipilih dan kualitas tidak turun.
- **Pratinjau putaran**: thumbnail (sudah memuat rotasi asal) diletakkan di kotak persegi dan diputar dengan CSS `transform`, sehingga ukuran kartu tidak berubah.
- **Seret**: drag and drop bawaan browser. Root tool juga menerima file yang diseret (`usePageFileDrop`); seretan internal tidak membawa tipe `Files`, jadi tidak memicu overlay.

## Batasan

- Seret-urutkan hanya untuk mouse; layar sentuh memakai tombol panah.
- Seperti Pisah PDF, halaman disalin ke dokumen baru: bookmark/outline, formulir interaktif tingkat dokumen, dan metadata tidak ikut.
- PDF berkata sandi belum didukung.

## Ide pengembangan

- Pilih banyak halaman sekaligus (Shift+klik) untuk dipindah/dihapus/diputar bersama.
- Sisipkan halaman kosong atau halaman dari PDF lain.
- Seret-urutkan untuk layar sentuh (pointer events).
