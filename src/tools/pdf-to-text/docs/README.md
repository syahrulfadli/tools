# PDF ke Teks

Rute: `/tools/pdf-ke-teks` · Kategori: File Converter (`file-converter`) · Definisi: `src/tools/pdf-to-text/index.tsx`

## Fungsi

Mengambil teks dari satu PDF untuk disalin ke clipboard atau diunduh sebagai `.txt` (UTF-8). Diproses di browser dengan pdf.js; PDF tidak diunggah.

## Cara pakai

1. Pilih, seret, atau tempel satu PDF. PDF berkata sandi bisa dibuka: kata sandi diminta dan hanya dipakai di browser.
2. Teks semua halaman diambil bertahap; status di bar menunjukkan halaman yang sedang dibaca.
3. Panel kiri:
   - **Halaman**: ketik rentang (`1-3, 8`) untuk mengambil sebagian halaman saja.
   - **Tandai awal tiap halaman** (bawaan menyala): menulis `--- Halaman n ---` sebelum isi halaman. Halaman tanpa teks dilewati.
   - **Gabung baris dalam paragraf**: menyambung baris yang terpotong di PDF menjadi satu baris per paragraf, termasuk kata berpenggal di akhir baris (`kali-` + `mat` → `kalimat`).
   - **Hasil**: jumlah kata, karakter, dan halaman tanpa teks.
4. **Salin teks** atau **Unduh .txt** (`<nama>.txt`).

Bila tidak ada satu pun halaman yang punya teks, area kerja memberi tahu bahwa PDF kemungkinan hasil scan.

## Struktur file

| File | Isi |
| --- | --- |
| `index.tsx` | `ToolDefinition` + skeleton (`ConverterSkeleton`). |
| `PdfToTextTool.tsx` | Halaman: buka PDF (termasuk kata sandi), ambil teks bertahap, opsi, salin/unduh. |
| `Preview.tsx` | SVG mini untuk home. |
| `pdf-to-text.css` | Kotak teks hasil dan skeleton baris. |
| `lib/extract.ts` | `extractPageLines`: `getTextContent` pdf.js → baris. Hanya mengimpor tipe pdf.js. |
| `lib/text.ts` | Fungsi murni: potongan teks → baris & paragraf, gabung baris, susun dokumen, hitung kata. |
| `lib/text.test.ts` | Test penyusunan teks + test ujung ke ujung (PDF dibuat pdf-lib, dibaca pdf.js). |

## Model data

```ts
TextItem { str, x, y /* garis dasar, poin */, width, height, hasEOL }
pages: Map<number /* halaman mulai 1 */, string[] /* baris; "" = jeda paragraf */>
```

## Alur penting

- **Baris dan spasi ditebak**: PDF hanya menyimpan potongan teks berposisi. Potongan dengan y yang bergeser lebih dari setengah ukuran huruf memulai baris baru; jarak vertikal di atas 1,8× ukuran huruf dianggap paragraf baru; jarak horizontal di atas 0,15× ukuran huruf diberi spasi. Penanda `hasEOL` dari pdf.js juga memecah baris.
- **Bertahap**: halaman dibaca satu per satu dan disimpan sebagai baris, sehingga mengganti opsi atau rentang halaman tidak membaca ulang PDF.
- **Kata sandi** memakai alur yang sama dengan PDF ke Gambar (`openPdf` + `PdfPasswordError`).

## Batasan

- Tidak ada OCR: PDF hasil scan/foto tidak punya teks untuk diambil.
- Tata letak kolom ganda dan tabel diambil sesuai urutan di PDF, yang tidak selalu urutan baca.
- Sebagian PDF lama memakai font tanpa peta Unicode, sehingga hurufnya keluar sebagai simbol acak.

## Ide pengembangan

- OCR di browser (mis. Tesseract WASM, di-host sendiri) untuk PDF hasil scan.
- Ekspor ke Markdown dengan judul ditebak dari ukuran huruf.
