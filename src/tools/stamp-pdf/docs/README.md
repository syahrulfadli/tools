# Nomor Halaman & Watermark

Rute: `/tools/nomor-halaman-watermark` · Kategori: Olah PDF (`pdf-tools`) · Definisi: `src/tools/stamp-pdf/index.tsx`

## Fungsi

Menulis nomor halaman dan/atau watermark (teks atau gambar) ke setiap halaman satu PDF. Isi halaman asal tidak diubah; nomor dan watermark teks ditambahkan di atasnya sebagai teks PDF asli (bisa dipilih dan dicari), watermark gambar sebagai gambar PDF. Diproses di browser, PDF dan gambar tidak diunggah.

## Cara pakai

1. Pilih, seret, atau tempel satu PDF.
2. **Nomor halaman** (menyala bawaan):
   - Format: `1`, `1 / 10`, `Halaman 1`, `Halaman 1 dari 10`.
   - Posisi (Atas/Bawah) dan Rata (Kiri/Tengah/Kanan).
   - Ukuran huruf 8–24 pt, jarak dari tepi 5–30 mm.
   - **Mulai di halaman**: halaman sebelum ini (sampul, daftar isi) tidak diberi nomor. **Nomor pertama**: angka yang tertulis di halaman mulai. "dari N" menghitung nomor terakhir yang benar-benar tertulis.
3. **Watermark** (mati bawaan), selalu di tengah halaman. Pilih **Jenis**:
   - **Teks**: maks. 60 karakter, ukuran 24–160 pt, warna Abu/Merah/Teal/Lainnya.
   - **Gambar**: PNG, JPEG, WebP, GIF, atau SVG (mis. logo). **Ukuran** 10–100%: gambar dimuat di kotak selebar dan setinggi persentase itu dari halaman, rasionya tetap.
   - Keduanya: kepekatan 5–60%, arah Miring (45°) atau Datar. Pilihan teks dan gambar disimpan terpisah, jadi berpindah jenis tidak menghapus isinya.
4. Kisi halaman di kanan menampilkan pratinjau di atas thumbnail. **Klik halaman** untuk membukanya besar di dialog (dirender ulang selebar layar, nomor dan watermark ikut tampil). Panah kiri/kanan atau tombol di bar berpindah halaman; Esc atau klik di luar menutup.
5. **Unduh PDF** → `<nama>-bernomor.pdf` (atau `<nama>-watermark.pdf` bila hanya watermark).

## Struktur file

| File                | Isi                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `index.tsx`         | `ToolDefinition` + skeleton (`ConverterSkeleton`).                                                        |
| `StampPdfTool.tsx`  | Halaman: panel pengaturan, pratinjau kisi halaman, unduh.                                                 |
| `components/StampedSheet.tsx` | Satu halaman dengan nomor & watermark ditumpuk; dipakai di kisi dan di pratinjau besar.         |
| `components/PageZoom.tsx` | Dialog `<dialog>` pratinjau besar: render ulang halaman (`usePageImage`), navigasi, tutup.          |
| `Preview.tsx`       | SVG mini untuk home.                                                                                      |
| `stamp-pdf.css`     | Tumpukan teks pratinjau (ukuran `cqi`).                                                                   |
| `lib/stamp.ts`      | Fungsi murni: format nomor, nomor per halaman, posisi nomor & watermark (`centeredOrigin`, `imageWatermarkSize`), cek karakter WinAnsi, warna hex. |
| `lib/image.ts`      | `loadWatermarkImage`: gambar pilihan user → PNG lewat kanvas (sisi terpanjang maks. 2000 px).            |
| `lib/apply.ts`      | `stampPdf`: menulis teks dengan pdf-lib.                                                                  |
| `lib/stamp.test.ts` | Test tata letak + test ujung ke ujung (hasil dibaca pdf.js, termasuk halaman diputar).                    |

Bahan bersama: `usePdfDocument`, `usePdfThumbnails`, `useSinglePdfInput`, `PdfDocumentCard`, `PdfWorkspaceState`, `toUserSpace`/`visualSize` (`src/lib/pdf-geometry.ts`).

## Model data

```ts
NumberOptions    { enabled, format, vertical, horizontal, size /* pt */, marginMm, startPage, firstNumber }
WatermarkOptions { enabled, kind /* "text" | "image" */, text, size /* pt */, image /* { png, width, height } | null */, scale /* 0–1 */, opacity /* 0–1 */, angle /* 0 | 45 */, color /* "#rrggbb" */ }
```

## Alur penting

- **Ruang tampilan → ruang pengguna**: posisi dihitung di halaman seperti terlihat (`visualSize`), lalu dipetakan dengan `toUserSpace` sesuai `/Rotate` dan asal CropBox. Sudut teks ditambah rotasi halaman, sehingga nomor tetap tegak di bawah halaman yang diputar.
- **Font**: Helvetica (nomor) dan Helvetica Bold (watermark), font standar PDF yang tidak perlu disematkan. Lebar teks dari metrik font (`widthOfTextAtSize`) agar rata kanan/tengah tepat.
- **Karakter**: font standar hanya mengenal WinAnsi (Latin). `unsupportedChars` menolak karakter lain sebelum unduh dan menyebutkannya.
- **Watermark di tengah**: titik awal teks digeser balik sebesar setengah lebar dan setengah tinggi huruf kapital yang sudah diputar (`watermarkOrigin`).
- **Watermark gambar**: file dibaca lewat `<img>` lalu digambar ke kanvas dan disimpan sebagai PNG (orientasi EXIF dan transparansi ikut; WebP/GIF/SVG jadi bisa disematkan karena pdf-lib hanya menerima PNG/JPEG). PNG disematkan sekali (`embedPng`) dan dipakai ulang di semua halaman. Posisi: kotak gambar diputar pada sudut kiri bawahnya, titik awal digeser balik sebesar setengah kotak yang diputar (`centeredOrigin`), sama seperti teks.
- **Pratinjau**: teks HTML di atas thumbnail dengan font Helvetica/Arial dan ukuran `cqi` relatif lebar halaman. Ini perkiraan; posisi pasti mengikuti PDF hasil.

## Batasan

- Hanya huruf Latin (WinAnsi). Aksara lain butuh font yang disematkan.
- Watermark ditulis di atas isi halaman (transparan), bukan di belakangnya.
- Teks watermark yang sangat panjang bisa melewati tepi halaman; kecilkan ukuran hurufnya.
- PDF berkata sandi belum didukung.
- Watermark gambar dari foto besar diperkecil ke 2000 px dan disimpan sebagai PNG, jadi bisa menambah ukuran PDF beberapa MB; logo PNG kecil hampir tidak menambah ukuran.
- Gambar watermark dipilih lewat tombol saja; menempel atau menyeret file ke halaman selalu membuka PDF.

## Ide pengembangan

- Pilih rentang halaman untuk watermark.
- Watermark berulang (pola ubin).
