# Gambar ke SVG

Rute: `/tools/gambar-ke-svg` · Kategori: File Converter (`file-converter`) · Definisi: `src/tools/image-to-svg/index.tsx`

## Fungsi

Melacak (vektorisasi) satu gambar PNG, JPEG, WebP, GIF, BMP, atau AVIF menjadi **SVG berisi bentuk vektor**, berwarna atau hitam putih, atau membungkus gambar apa adanya di dalam SVG. Asli dan hasil tampil berdampingan. Pelacakan berjalan di Web Worker di browser; gambar tidak dikirim ke server. Kebalikannya ada di [SVG ke Gambar](../../svg-to-image/docs/README.md).

## Cara pakai

1. **Buka gambar:** tombol, area kosong, seret, atau tempel (Ctrl/⌘+V). Satu gambar sekaligus; file lain dilaporkan (SVG: "sudah berupa SVG").
2. **Cara konversi:**
   - *Warna* (bawaan): bentuk berwarna; **Jumlah warna** 2–32 (bawaan 16).
   - *Hitam putih*: piksel lebih gelap dari **Ambang** (bawaan 50%) jadi bentuk hitam, sisanya transparan.
   - *Sematkan*: gambar asli (data URL) di dalam `<image>`, tanpa pelacakan.
3. **Detail** (Warna dan Hitam putih): *Halus* / *Seimbang* (bawaan) / *Rinci*, dan **resolusi lacak** 500 / 1.000 (bawaan) / 2.000 px untuk sisi terpanjang. Gambar tidak diperbesar; ukuran lacak tampil di kepala seksi.
4. **Unduh SVG** (`<nama>.svg`) atau **Salin kode** ke clipboard.

Perubahan pengaturan melacak ulang otomatis setelah jeda 300 ms; hasil lama tetap tampil redup sampai hasil baru siap. Selama melacak ada progres per warna dan tombol **Batal** (lalu **Lacak lagi**).

## Struktur file

| File | Isi |
| --- | --- |
| `index.tsx` | `ToolDefinition`; skeleton memakai `ConverterSkeleton`. |
| `ImageToSvgTool.tsx` | Komponen utama: buka gambar, pekerjaan lacak, perbandingan, unduh/salin. |
| `Preview.tsx` | SVG mini untuk home. |
| `image-to-svg.css` | Perbandingan Asli/SVG di atas papan catur. |
| `lib/trace.ts` | `prepare`, `medianCutPalette`, `traceToSvg`, `hexColor` (+ test). Satu-satunya modul yang mengimpor imagetracerjs. |
| `lib/output.ts` | `traceSize`, `embedSvg` (+ test). Dipisah agar chunk tool tidak membawa imagetracerjs. |
| `lib/trace.worker.ts` | Web Worker: menjalankan `traceToSvg`, mengirim pesan `progress` / `done` / `error`. |
| `lib/tracer.ts` | Sisi browser: `rasterize` (bitmap → RGBA pada ukuran lacak), `startTrace` (worker + batal), `readDataUrl`. |
| `lib/imagetracerjs.d.ts` | Tipe minimal untuk bagian imagetracerjs yang dipakai. |

## Model data

```ts
Source { file, bitmap: ImageBitmap, url /* object URL asli */ }
Settings { mode: "color" | "mono" | "embed", colors, detail: "low" | "medium" | "high", threshold /* 1–254 */, maxEdge }
Result { key, blob, url, text, colors?, shapes? }
Job = idle | tracing { done, total } | cancelled | error { message }
```

## Alur penting

- **Library:** `imagetracerjs@1.2.6` (Unlicense, JS murni, ±22 KB), dikunci versi persis. Hanya dimuat di worker (`assets/trace.worker-*.js`), yang ikut di-precache service worker. Worker dibuat dengan `new Worker(new URL(...), { type: "module" })` dari domain sendiri, cocok dengan CSP `script-src 'self'`.
- **Persiapan piksel** (`prepare`): alfa dijadikan biner (ambang 128) agar tepi semi-transparan tidak jadi warna sendiri. Mode hitam putih memakai luminans Rec. 601.
- **Palet:** `medianCutPalette` atas maks. ±40 ribu sampel piksel opak, dibelah di **tengah rentang nilai** (bukan median jumlah piksel) agar warna kecil yang kontras, seperti teks merah di logo putih, mendapat warna sendiri. Imagetracer lalu menyempurnakannya dengan k-means (3 putaran). Warna transparan selalu ditambahkan ke palet agar area kosong tidak diserap warna terdekat, lalu lapisannya dibuang.
- **Pelacakan per warna:** fungsi internal imagetracer (`layeringstep → pathscan → internodes → batchtracepaths`) dipanggil per warna agar progres bisa dilaporkan. Warna terluas digambar dulu.
- **SVG ringkas:** satu `<path>` per warna (semua bentuk digabung dalam satu `d`, lubang ikut sebagai subpath berarah terbalik). Mode warna memberi `stroke` sewarna 0,6 untuk menutup celah rambut di antara warna bersebelahan; mode hitam putih tanpa stroke. `viewBox` = ukuran lacak, `width`/`height` = ukuran gambar asli.
- **Detail:** Halus `pathomit 24, ltres/qtres 2`; Seimbang `8, 1`; Rinci `1, 0,5` dengan koordinat 2 desimal.
- **Batal:** pelacakan sinkron di worker tidak bisa disela, jadi `cancel()` mematikan worker (`terminate`). Setiap perubahan gambar/pengaturan membatalkan pekerjaan sebelumnya dengan cara yang sama.
- **Memori:** bitmap ditutup dan object URL dilepas saat gambar diganti, ditutup, atau tool ditutup. Data RGBA dipindahkan (transfer) ke worker, tidak disalin.

## Batasan

- Paling cocok untuk logo, ikon, ilustrasi datar, tanda tangan. Foto menjadi efek "lukisan" dengan file besar (foto penuh noise 1.000 px dengan 16 warna: ±2 MB; 2.000 px Rinci bisa puluhan detik).
- Gradien menjadi pita warna; tidak ada `<linearGradient>`.
- Satu gambar per sesi.
- Mode *Sematkan* tidak membuat vektor; file membesar ±33% karena base64.

## Ide pengembangan

- Hapus latar otomatis (warna sudut gambar jadi transparan) di mode warna.
- Pratinjau diperbesar untuk membandingkan tepi.
- Palet kustom (pilih warna sendiri, mis. warna merek).
