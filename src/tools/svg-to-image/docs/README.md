# SVG ke Gambar

Rute: `/tools/svg-ke-gambar` · Kategori: File Converter (`file-converter`) · Definisi: `src/tools/svg-to-image/index.tsx`

## Fungsi

Mengubah banyak file SVG sekaligus menjadi **PNG atau JPEG**. SVG digambar ulang pada ukuran tujuan (bukan bitmap yang diperbesar), jadi hasilnya tajam di ukuran berapa pun. Latar bisa transparan (PNG) atau berwarna. Semua proses di browser. Kebalikannya ada di [Gambar ke SVG](../../image-to-svg/docs/README.md).

## Cara pakai

1. **Tambah SVG:** tombol, area kosong, seret ke halaman, atau tempel (Ctrl/⌘+V). Kode SVG yang disalin sebagai teks (mis. "Copy as SVG" di Figma, atau dari editor kode) juga bisa ditempel; jadi file `tempelan-<stempel waktu>.svg`. File bukan SVG atau SVG rusak dilaporkan dengan alasannya.
2. **Format:** PNG (bawaan) atau JPEG (kualitas 50–100%, bawaan 92%).
3. **Ukuran:** *Skala* 1× / 2× (bawaan) / 3× / 4× dari ukuran asli SVG, atau *Lebar tetap* dalam piksel (16–16.384; tinggi mengikuti rasio).
4. **Latar:** PNG: Transparan (bawaan), Putih, Hitam, warna bebas. JPEG: Putih (bawaan), Hitam, warna bebas. Pilihan latar PNG dan JPEG disimpan terpisah.
5. **Unduh:** per baris, atau semua lewat tombol utama (satu file → `.png`/`.jpg`, banyak → `svg-png|jpg-<stempel>.zip`).

Setiap perubahan pengaturan merender ulang semua SVG otomatis (setelah jeda 250 ms).

## Struktur file

| File | Isi |
| --- | --- |
| `index.tsx` | `ToolDefinition`; skeleton memakai `ConverterSkeleton`. |
| `SvgToImageTool.tsx` | Komponen utama: daftar, antrean render, tempel kode SVG, unduhan. |
| `Preview.tsx` | SVG mini untuk home. |
| `svg-to-image.css` | Jarak kontrol panel, thumbnail `contain`. Baris memakai `.convert-row` bersama. |
| `lib/size.ts` | `parseLength`, `parseViewBox`, `intrinsicSize`, `outputSize` (+ test). Murni, tanpa DOM. |
| `lib/render.ts` | `readSvg`, `renderSvg`, `isSvg`, `looksLikeSvg` (+ test untuk `looksLikeSvg`). |

## Model data

```ts
Item { id, name, size, source: SvgSource, thumbUrl /* object URL SVG */, result?: { key, blob, url, width, height }, error? }
SvgSource { text /* sudah diberi xmlns bila perlu */, width, height, declared }
Sizing = { mode: "scale", scale } | { mode: "width", width }
```

`key` = gabungan format, kualitas (hanya JPEG), latar, dan ukuran. Hasil segar hanya bila `result.key` sama.

## Alur penting

- **Ukuran asli** (`intrinsicSize`), mengikuti aturan browser untuk `<img>`: `width`/`height` bila absolut (px, pt, mm, cm, in, em, …); sisi yang hilang dari rasio `viewBox`; tanpa keduanya memakai `viewBox`; tanpa apa pun 300 × 150 dan baris diberi catatan "ukuran tidak tertulis di SVG". Persen dianggap tidak tertulis.
- **Render tajam:** `renderSvg` mengganti `width`/`height` akar dengan ukuran piksel tujuan dan menambah `viewBox="0 0 w h"` bila tidak ada, lalu memuat hasil serialisasi sebagai `<img>` (blob URL) dan menggambarnya ke kanvas.
- **Tanpa xmlns:** SVG yang ditulis untuk HTML sering tanpa `xmlns`; tanpa itu browser tidak mau memuatnya sebagai gambar, jadi `readSvg` menambahkannya.
- **Batas kanvas:** `outputSize` memakai `canvasLimitFactor` (maks. 16,7 juta piksel); catatan muncul di seksi Ukuran bila ada yang diperkecil.
- **Antrean:** sama dengan PNG ke JPEG (satu SVG per putaran, `busy` ref + `turn`).
- **Memori:** object URL thumbnail dan hasil dilepas saat dihapus, mulai ulang, atau tool ditutup.

## Batasan

- SVG dimuat sebagai gambar, jadi **sumber eksternal tidak dimuat** (gambar `href="https://…"`, font web dari URL, CSS `@import`). Gambar/font yang disematkan sebagai `data:` tetap tampil. Teks memakai font sistem bila font-nya tidak disematkan.
- Skrip dan animasi tidak jalan; yang digambar adalah keadaan awal.
- Safari bisa menolak SVG berisi `<foreignObject>` (kanvas "tainted"); baris itu menampilkan pesan galat.

## Ide pengembangan

- WebP sebagai format keluaran.
- Preset ukuran ikon (16/32/180/192/512) dalam satu ZIP untuk favicon.
