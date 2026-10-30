# Nomor Halaman & Watermark

Rute: `/tools/nomor-halaman-watermark` · Kategori: Olah PDF (`pdf-tools`) · Definisi: `src/tools/stamp-pdf/index.tsx`

## Fungsi

Menulis nomor halaman dan/atau watermark teks ke setiap halaman satu PDF. Isi halaman asal tidak diubah; teks baru ditambahkan di atasnya sebagai teks PDF asli (bisa dipilih dan dicari). Diproses di browser, PDF tidak diunggah.

## Cara pakai

1. Pilih, seret, atau tempel satu PDF.
2. **Nomor halaman** (menyala bawaan):
   - Format: `1`, `1 / 10`, `Halaman 1`, `Halaman 1 dari 10`.
   - Posisi (Atas/Bawah) dan Rata (Kiri/Tengah/Kanan).
   - Ukuran huruf 8–24 pt, jarak dari tepi 5–30 mm.
   - **Mulai di halaman**: halaman sebelum ini (sampul, daftar isi) tidak diberi nomor. **Nomor pertama**: angka yang tertulis di halaman mulai. "dari N" menghitung nomor terakhir yang benar-benar tertulis.
3. **Watermark** (mati bawaan): teks (maks. 60 karakter), ukuran 24–160 pt, kepekatan 5–60%, arah Miring (45°) atau Datar, warna Abu/Merah/Teal/Lainnya. Selalu di tengah halaman.
4. Kisi halaman di kanan menampilkan pratinjau di atas thumbnail.
5. **Unduh PDF** → `<nama>-bernomor.pdf` (atau `<nama>-watermark.pdf` bila hanya watermark).

## Struktur file

| File                | Isi                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `index.tsx`         | `ToolDefinition` + skeleton (`ConverterSkeleton`).                                                        |
| `StampPdfTool.tsx`  | Halaman: panel pengaturan, pratinjau kisi halaman, unduh.                                                 |
| `Preview.tsx`       | SVG mini untuk home.                                                                                      |
| `stamp-pdf.css`     | Tumpukan teks pratinjau (ukuran `cqi`).                                                                   |
| `lib/stamp.ts`      | Fungsi murni: format nomor, nomor per halaman, posisi nomor & watermark, cek karakter WinAnsi, warna hex. |
| `lib/apply.ts`      | `stampPdf`: menulis teks dengan pdf-lib.                                                                  |
| `lib/stamp.test.ts` | Test tata letak + test ujung ke ujung (hasil dibaca pdf.js, termasuk halaman diputar).                    |

Bahan bersama: `usePdfDocument`, `usePdfThumbnails`, `useSinglePdfInput`, `PdfDocumentCard`, `PdfWorkspaceState`, `toUserSpace`/`visualSize` (`src/lib/pdf-geometry.ts`).

## Model data

```ts
NumberOptions    { enabled, format, vertical, horizontal, size /* pt */, marginMm, startPage, firstNumber }
WatermarkOptions { enabled, text, size /* pt */, opacity /* 0–1 */, angle /* 0 | 45 */, color /* "#rrggbb" */ }
```

## Alur penting

- **Ruang tampilan → ruang pengguna**: posisi dihitung di halaman seperti terlihat (`visualSize`), lalu dipetakan dengan `toUserSpace` sesuai `/Rotate` dan asal CropBox. Sudut teks ditambah rotasi halaman, sehingga nomor tetap tegak di bawah halaman yang diputar.
- **Font**: Helvetica (nomor) dan Helvetica Bold (watermark), font standar PDF yang tidak perlu disematkan. Lebar teks dari metrik font (`widthOfTextAtSize`) agar rata kanan/tengah tepat.
- **Karakter**: font standar hanya mengenal WinAnsi (Latin). `unsupportedChars` menolak karakter lain sebelum unduh dan menyebutkannya.
- **Watermark di tengah**: titik awal teks digeser balik sebesar setengah lebar dan setengah tinggi huruf kapital yang sudah diputar (`watermarkOrigin`).
- **Pratinjau**: teks HTML di atas thumbnail dengan font Helvetica/Arial dan ukuran `cqi` relatif lebar halaman. Ini perkiraan; posisi pasti mengikuti PDF hasil.

## Batasan

- Hanya huruf Latin (WinAnsi). Aksara lain butuh font yang disematkan.
- Watermark ditulis di atas isi halaman (transparan), bukan di belakangnya.
- Teks watermark yang sangat panjang bisa melewati tepi halaman; kecilkan ukuran hurufnya.
- PDF berkata sandi belum didukung.

## Ide pengembangan

- Watermark gambar (logo).
- Pilih rentang halaman untuk watermark.
- Watermark berulang (pola ubin).
