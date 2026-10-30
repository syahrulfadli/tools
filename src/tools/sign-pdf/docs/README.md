# Tanda Tangan PDF

Rute: `/tools/tanda-tangan-pdf` · Kategori: Olah PDF (`pdf-tools`) · Definisi: `src/tools/sign-pdf/index.tsx`

## Fungsi

Menempel gambar tanda tangan ke satu atau beberapa halaman PDF. Tanda tangan digambar langsung (mouse, jari, pena) atau diunggah dari foto/scan. Hasilnya PDF baru dengan tanda tangan sebagai gambar. Semua diproses di browser: PDF dan tanda tangan tidak diunggah dan tidak disimpan.

Ini tanda tangan visual (seperti tanda tangan basah yang dipindai), **bukan** tanda tangan digital bersertifikat.

## Cara pakai

1. Pilih, seret, atau tempel satu PDF.
2. **Tanda tangan** di panel kiri:
   - **Gambar**: tanda tangani kotak putih. Urungkan menghapus goresan terakhir, Hapus mengosongkan. Warna tinta (Hitam, Biru, Lainnya) dan tebal garis (Tipis, Sedang, Tebal) bisa diganti kapan saja, juga setelah ditempel.
   - **Unggah gambar**: PNG/JPEG/WebP. "Buang latar putih" (menyala bawaan) membuat kertas putih jadi transparan. Gambar otomatis dipotong ke area bertinta.
3. **Tempel**: klik di halaman (tanda tangan berpusat di titik klik), atau tombol "Tempel di halaman ini" (pojok kanan bawah).
4. **Atur**: seret untuk memindah, tarik kotak di sudut kanan bawah untuk mengubah ukuran (rasio tetap), tombol × untuk menghapus. Keyboard: Tab ke tanda tangan, panah menggeser 1% (Shift: 5%), `+`/`−` mengubah ukuran, Delete menghapus, Esc melepas pilihan.
5. Pindah halaman dengan panah di atas halaman atau chip "Hal. n" di panel Penempatan. **Salin ke semua halaman** menyalin tanda tangan terpilih ke posisi yang sama di setiap halaman yang belum punya tanda tangan (untuk paraf).
6. **Unduh PDF** → `<nama>-ditandatangani.pdf`.

## Struktur file

| File | Isi |
| --- | --- |
| `index.tsx` | `ToolDefinition` + skeleton (`ConverterSkeleton`). |
| `SignPdfTool.tsx` | Halaman: sumber tanda tangan, penempatan, pager, unduh. |
| `Preview.tsx` | SVG mini untuk home. |
| `sign-pdf.css` | Kanvas tanda tangan, halaman besar, kotak tanda tangan dan pegangan ukuran. |
| `components/SignaturePad.tsx` | Kanvas gambar (pointer events), goresan disimpan sebagai titik. |
| `components/PageStage.tsx` | Halaman besar + tanda tangan yang bisa diseret, diubah ukurannya, dan digeser dengan keyboard. |
| `lib/placement.ts` | Fungsi murni posisi relatif: tinggi dari rasio, jepit ke halaman, tempel di titik, ke persegi poin PDF. |
| `lib/signature.ts` | Fungsi murni: batas goresan, buang latar putih, batas area bertinta. |
| `lib/render.ts` | Canvas: goresan → PNG, gambar unggahan → PNG transparan terpotong. |
| `lib/apply.ts` | `signPdf`: menyematkan PNG sekali dan menggambarnya di setiap posisi dengan pdf-lib. |
| `lib/sign.test.ts` | Test penempatan dan pengolahan gambar. |

## Model data

```ts
Stroke    = [x, y][]                                  // px CSS di kanvas
Signature { bytes: Uint8Array /* PNG */, url, width, height }
Placement { id, page /* mulai 1 */, x, y /* kiri atas, 0–1 */, w /* 0–1 dari lebar halaman */ }
```

Tinggi tanda tangan tidak disimpan: `w × (tinggi/lebar gambar) × (lebar/tinggi halaman)`.

## Alur penting

- **Posisi relatif**: posisi disimpan 0–1 terhadap halaman seperti terlihat, jadi tidak bergantung pada ukuran layar. Saat diunduh, `toPdfRect` mengubahnya ke poin dan `toUserSpace` (`src/lib/pdf-geometry.ts`) memetakan ke ruang pengguna halaman, termasuk halaman ber-`/Rotate` dan CropBox yang tidak di (0,0). Gambar diputar sebesar rotasi halaman agar tampak tegak.
- **Tajam saat dicetak**: goresan digambar ulang 4× ukuran kanvas ke PNG transparan yang dipotong rapat (`strokeBounds`), bukan disalin dari kanvas layar.
- **Ganti gaya tanpa menggambar ulang**: goresan disimpan sebagai titik, sehingga warna/tebal bisa diganti dan PNG dibuat ulang. Bila rasio PNG berubah, semua posisi dijepit ulang agar tetap di halaman.
- **Latar putih**: `whiteToTransparent` menurunkan alfa piksel terang secara bertahap (bukan ambang keras) agar tepi tinta tetap halus.
- **Halaman besar** dirender pdf.js selebar ±900 px × devicePixelRatio (maks. 1600 px) hanya untuk halaman yang sedang dilihat.

## Batasan

- Bukan tanda tangan digital (tidak ada sertifikat atau segel kriptografis).
- Tanda tangan tidak disimpan: menutup tab menghapusnya (disengaja, sesuai aturan privasi).
- PDF berkata sandi belum didukung.
- Formulir PDF interaktif tidak diisi; tanda tangan hanya ditumpuk di atas halaman.

## Ide pengembangan

- Tanda tangan ketik (nama dengan font tulisan tangan yang di-host sendiri).
- Tambah teks bebas dan tanggal di samping tanda tangan.
- Beberapa tanda tangan berbeda (mis. tanda tangan + paraf) dalam satu PDF.
