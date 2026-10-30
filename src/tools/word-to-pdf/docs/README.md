# Word ke PDF

Rute: `/tools/word-ke-pdf` · Kategori: File Converter (`file-converter`) · Definisi: `src/tools/word-to-pdf/index.tsx`

## Fungsi

Mengubah dokumen Word (`.docx`) menjadi PDF di browser. Dokumen dirender ke HTML dengan [docx-preview](https://github.com/VolodymyrBaydalka/docxjs), lalu disimpan lewat dialog cetak browser ("Simpan sebagai PDF"). Teks di PDF tetap teks (bisa dipilih, dicari, dibaca ATS untuk CV), bukan gambar. Ukuran kertas, orientasi, dan margin mengikuti dokumen. File tidak dikirim ke server.

## Cara pakai

1. **Buka dokumen:** klik area kosong atau "Pilih file Word", seret file ke halaman, atau tempel (Ctrl/⌘+V). Satu dokumen sekaligus; file lain dilaporkan di panel Dokumen dengan alasannya (`.doc` lama, `.odt`, dll.).
2. **Periksa pratinjau:** area kerja menampilkan halaman persis seperti yang akan dicetak. Kepala area kerja dan pill menyebut perkiraan jumlah halaman PDF dan ukuran kertas (mis. "A4 potret, A4 lanskap").
3. **Nama file** (opsional): dipakai sebagai judul dokumen, yang diusulkan Chrome/Edge sebagai nama file PDF.
4. **Simpan PDF:** dialog cetak terbuka. Pilih tujuan **Simpan sebagai PDF**, biarkan margin Default dan skala 100%.

## Struktur file

| File | Isi |
| --- | --- |
| `index.tsx` | `ToolDefinition`; skeleton `ConverterSkeleton`. |
| `WordToPdfTool.tsx` | Halaman: status dokumen, iframe pratinjau, zoom, sinkron tema, tombol cetak. |
| `Preview.tsx` | SVG mini untuk home. |
| `word-to-pdf.css` | Langkah simpan di panel, iframe pratinjau. Kartu dokumen memakai `.doc-card` dari `styles/tool.css`. |
| `lib/render.ts` | `renderDocx` (parse, perbaikan, render ke iframe, ukur), `FRAME_SRCDOC` (gaya layar & cetak), `fitZoom`, `printFrame`, `clearDocx`, validasi file. |
| `lib/sections.ts` | `breakBeforeNewSections`: pemisah bagian Word mulai di halaman baru. |
| `lib/pages.ts` | `parseLength`, `pageSizeOf`, `describePage`, `pageRules` (@page bernama), `printedSheets` (perkiraan lembar). |
| `lib/fonts.ts` | `withFallback`: font cadangan untuk font Office yang tidak terpasang. |
| `lib/*.test.ts` | Test logika murni di atas. |

## Model data

```ts
type Doc =
  | { phase: "empty" }
  | { phase: "opening"; file: File }
  | { phase: "ready"; file: File; pages: PageSize[]; sheets: number } // pages = halaman Word, sheets = perkiraan lembar PDF
  | { phase: "error"; file: File; message: string };
```

## Alur penting

- **Kenapa dialog cetak, bukan unduhan langsung:** membuat PDF berteks dari HTML butuh mesin tata letak; browser sudah punya. Jalur alternatif (HTML → kanvas → gambar di PDF) membuat teks tidak bisa dipilih/dicari dan file lebih besar.
- **Iframe sebagai pratinjau sekaligus halaman cetak:** `srcdoc` (`FRAME_SRCDOC`) dengan `sandbox="allow-same-origin allow-modals"`: gaya dokumen terpisah dari gaya aplikasi, skrip di dalam dokumen tidak jalan, dan `print()` mencetak isi iframe saja. Pratinjau dan cetak memakai HTML yang sama; bedanya hanya `@media screen` (zoom, latar well, garis halaman) vs `@media print`.
- **Render:** `parseAsync` → `breakBeforeNewSections` → `renderDocument` (sama dengan `renderAsync` docx-preview plus perbaikan). Elemen `<style>` dipasang di `<head>` iframe dengan `data-docx` (dihapus `clearDocx` saat ganti dokumen). Gambar dan font tertanam sebagai data URL (`useBase64URL`), jadi tidak ada object URL yang perlu dilepas dan CSP `img-src`/`font-src data:` sudah cukup.
- **Pemisah halaman:** `ignoreLastRenderedPageBreak: false` mengikuti titik pindah halaman yang disimpan Word, jadi halaman PDF sama dengan di Word bila fontnya sama. Pemisah bagian (section break) jenis "halaman berikutnya" (bawaan Word) diabaikan docx-preview 0.4, sehingga `breakBeforeNewSections` menandai paragraf pertama bagian baru dengan `pageBreakBefore`.
- **Ukuran kertas:** tiap section docx-preview punya `width`/`min-height` (pt). `pageRules` membuat satu `@page docx-page-N { size; margin: 0 }` per ukuran unik dan section diberi `page: docx-page-N`, jadi dokumen campuran potret/lanskap tercetak benar. Margin dokumen tetap padding section.
- **Isi lebih panjang dari satu halaman** (dokumen tanpa titik pindah halaman, mis. dari Google Docs, atau font pengganti lebih lebar): browser memecahnya ke lembar berikutnya; `box-decoration-break: clone` mengulang margin atas/bawah di tiap lembar. `printedSheets` memperkirakan jumlah lembar dari tinggi section (diukur pada zoom 1) untuk pill.
- **`min-height` dikurangi 1 pt:** mencegah lembar kosong akibat pembulatan subpiksel ketika isi tepat setinggi kertas.
- **Tidak ada elemen sebelum section pertama:** elemen yang ikut halaman `@page` tanpa nama memaksa pindah halaman sebelum section bernama pertama dan memunculkan lembar kosong di awal (ditemukan saat pengujian; karena itu gaya ditaruh di `<head>`).
- **Font cadangan:** `withFallback` menambahkan kembaran bermetrik sama (Calibri → Carlito, Cambria → Caladea, Arial → Liberation Sans/Arimo, …) dan keluarga generik ke `font-family` di aturan CSS, variabel font tema (`--docx-*-font`), dan gaya inline. Tanpa ini perangkat tanpa Calibri (Android, Linux) jatuh ke font serif bawaan.
- **Warna:** `print-color-adjust: exact` agar arsiran tabel dan warna latar ikut tercetak tanpa mencentang "Grafik latar belakang".
- **Tema:** token `--well` dan `--border` disalin dari aplikasi ke `:root` iframe dan diperbarui saat `data-theme` berubah. Halaman tetap putih (isi file).
- **Nama file:** `printFrame` mengisi judul iframe dan sementara judul jendela utama (dipulihkan setelah `print()` kembali).

## Batasan

- Hanya `.docx`. `.doc` (Word 97–2003) dan `.docx` berkata sandi (keduanya wadah OLE) ditolak dengan petunjuk menyimpan ulang.
- Tata letak mengikuti docx-preview: kotak teks melayang, WordArt, SmartArt, bagan, dan persamaan bisa berbeda dari Word. Daftar isi tampil sesuai hasil terakhir yang disimpan Word.
- Kolom nomor halaman (`PAGE`) menampilkan nilai yang tersimpan, bukan nomor halaman sebenarnya; header/footer hanya di halaman Word, tidak di lembar lanjutan saat isi meluber.
- Hasil bergantung pada font di perangkat. Bila font dokumen dan kembarannya tidak ada, baris bisa bergeser dan jumlah halaman berubah.
- Dialog cetak dan nama file usulan diatur browser. Di iPhone/iPad, PDF disimpan lewat Bagikan → Simpan ke File.

## Ide pengembangan

- Layani Carlito dan Caladea (lisensi OFL) dari domain sendiri agar dokumen Calibri/Cambria tetap rapi di semua perangkat.
- Nomor halaman sebenarnya untuk kolom `PAGE`/`NUMPAGES` di header/footer.
- Banyak dokumen sekaligus.
