# PNG ke JPEG

Rute: `/tools/png-ke-jpg` · Kategori: File Converter (`file-converter`) · Definisi: `src/tools/png-to-jpg/index.tsx`

## Fungsi

Mengubah banyak gambar PNG (juga WebP, GIF bingkai pertama, BMP, AVIF) menjadi JPEG sekaligus. Area transparan diisi warna latar pilihan, ukuran bisa diperkecil, dan perubahan ukuran file langsung terlihat per gambar. Semua proses di browser.

## Cara pakai

1. **Tambah gambar:** tombol, area kosong, seret ke halaman, atau tempel (Ctrl/⌘+V). File lain dilaporkan dengan alasannya.
2. **Kualitas JPEG:** 50–100% (bawaan 90%).
3. **Latar area transparan:** Putih, Hitam, atau warna bebas. Catatan di bawahnya memberi tahu apakah gambar yang dimuat punya area transparan.
4. **Ukuran:** sisi terpanjang maksimum Asli / 4.096 / 2.048 / 1.080 px. Gambar tidak pernah diperbesar.
5. **Unduh:** per baris (ikon unduh), atau semua lewat tombol utama (satu file → `.jpg`, banyak → `.zip`).

Setiap perubahan pengaturan mengonversi ulang semua gambar otomatis (setelah jeda 250 ms agar slider tidak memicu konversi tiap piksel).

## Struktur file

| File | Isi |
| --- | --- |
| `index.tsx` | `ToolDefinition`; skeleton memakai `ConverterSkeleton` bersama. |
| `PngToJpgTool.tsx` | Komponen utama: daftar gambar, antrean konversi, ringkasan, unduhan. |
| `Preview.tsx` | SVG mini untuk home. |
| (tanpa css sendiri) | Baris daftar memakai `.convert-list` / `.convert-row` bersama di `styles/tool.css`. |
| `lib/convert.ts` | `decode` (ImageBitmap + deteksi transparansi), `toJpeg`, `targetSize`, `sizeChange` (+ test). |

## Model data

```ts
Item {
  id, name, size /* byte asli */, bitmap: ImageBitmap, width, height, hasAlpha,
  result?: { key, blob, url /* object URL */, width, height },
  error?: string,
}
ConvertOptions { quality: 0..1, background: string, maxEdge: number /* 0 = asli */ }
```

`key` = gabungan opsi (`kualitas|latar|maxEdge`). Hasil dianggap segar hanya bila `result.key` sama dengan opsi aktif.

## Alur penting

- **Antrean:** effect memproses satu gambar per putaran (`busy` ref). Setiap selesai, state `turn` dinaikkan agar putaran berikutnya tetap jalan walau daftar tidak berubah (mis. gambar dihapus saat sedang dikonversi). Hasil untuk gambar yang sudah dihapus dibuang dan URL-nya dilepas.
- **Deteksi transparansi:** pada salinan maks. 256 px agar cepat; dipakai untuk catatan dan meta baris "ada transparansi".
- **Ukuran:** `targetSize` = min(batas sisi pilihan, batas kanvas browser), tanpa memperbesar.
- **Selisih ukuran:** hijau bila JPEG lebih kecil, merah bila lebih besar (bisa terjadi pada gambar penuh detail/noise).
- **Memori:** `bitmap.close()` dan `URL.revokeObjectURL` saat gambar dihapus, mulai ulang, atau tool ditutup.
- **Nama file:** `<nama>.jpg`; di ZIP, nama kembar diberi nomor (`uniqueNamer`). ZIP: `jpeg-<stempel waktu>.zip`.

## Batasan

- GIF animasi hanya bingkai pertama.
- Metadata (EXIF, profil warna) tidak dibawa ke JPEG.
- HEIC tidak didukung.

## Ide pengembangan

- Target ukuran file ("maks. 500 KB") dengan pencarian kualitas otomatis.
- Format keluaran lain (WebP) sebagai opsi.
