# Kolase Foto

Rute: `/tools/kolase` · Kategori: Edit Gambar (`image-editor`) · Definisi: `src/tools/collage/index.ts`

## Fungsi

Menggabungkan beberapa foto jadi satu gambar dalam grid R×K (1–8 baris, 1–8 kolom) dengan rasio siap unggah, lalu mengunduhnya sebagai PNG atau JPG. Semua proses di browser; foto tidak pernah dikirim atau disimpan.

## Cara pakai

1. **Tambah foto:** tombol "Tambah foto", klik sel kosong, seret file ke halaman atau ke sel tertentu, atau tempel dari clipboard (Ctrl/⌘+V; masuk ke sel terpilih bila ada).
2. **Grid:** preset 1×2, 2×1, 2×2, 1×3, 3×1, 2×3, 3×2, 3×3, 4×4, atau stepper Baris/Kolom.
3. **Rasio:** 1:1, 4:5 (Instagram), 9:16 (Story), 3:4, 2:3 (Cetak 4R), 16:9, 4:3, 3:2, atau kustom (1–50 : 1–50).
4. **Jarak dan sudut:** jarak antar foto, tepi luar, sudut membulat.
5. **Foto di sel:** *Isi penuh* (bawaan) menutupi seluruh sel dan memotong tepi yang tidak muat; *Utuh* menampilkan seluruh foto tanpa dipotong, sisa ruang sel diisi warna latar. Setelan ini berlaku untuk semua sel (dan menghapus pilihan per sel); tiap sel bisa diubah sendiri di **Sel terpilih → Tampilan foto**.
6. **Latar:** putih, hitam, batu, transparan (PNG saja), atau warna bebas.
7. **Atur foto di sel:** klik untuk memilih, seret untuk menggeser (di mode Utuh: memindah letak foto di dalam sel), zoom lewat slider, Ctrl/⌘+scroll, atau pinch di trackpad. Keyboard: panah menggeser, `+`/`-` zoom, Delete mengosongkan sel, Enter memilih/menambah.
8. **Tukar posisi:** seret thumbnail dari panel Foto ke sel lain. Jika foto sudah ada di sel lain, keduanya bertukar.
9. **Ekspor:** sisi terpanjang 1080 / 2048 / 4096 px, format PNG/JPG, lalu "Unduh".

Di layar sentuh, ketukan pertama pada sel hanya memilih sel supaya halaman tetap bisa digulir; geser foto setelah sel terpilih.

## Struktur file

| File | Isi |
| --- | --- |
| `index.ts` | `ToolDefinition` (nama, kata kunci pencarian, lazy load). |
| `CollageTool.tsx` | Komponen utama: state, muat file, tempel, drop halaman, ekspor. Memakai `ToolBar`, `useFilePicker`, `usePageFileDrop`, `usePasteFiles` dari `components/tool/`. |
| `CollageSkeleton.tsx` | Skeleton saat chunk dimuat (memakai class CSS yang sama). |
| `Preview.tsx` | SVG mini untuk baris di home. |
| `collage.css` | Tiga kolom, preset grid/rasio, kanvas, tray. Kerangka & kontrol umum ada di `src/styles/tool.css`. |
| `components/CollageCanvas.tsx` | Pratinjau interaktif: ukuran pas well, seret/geser, zoom wheel, keyboard, drop per sel. |
| `components/SettingsPanel.tsx` | Panel kiri (Grid, Rasio, Jarak dan sudut, Latar) dan `ExportSection`. |
| `components/PhotosPanel.tsx` | Panel kanan: tambah foto, tray, progres, kegagalan, sel terpilih, slot untuk Ekspor. |
| `components/Glyphs.tsx` | `GridGlyph`, `RatioGlyph`. |
| `lib/presets.ts` | Preset grid, rasio, ukuran, latar, batas slider. |
| `lib/layout.ts` | `CollageSettings`, `outputSize`, `cellRects`, `snapRect`, `cornerRadius`. |
| `lib/crop.ts` | `Fit`, `Framing`, `placeImage`, `visibleArea`, `panBy`, `zoomTo`. |
| `lib/state.ts` | Reducer: foto, sel, pilihan, setelan. |
| `lib/images.ts` | Muat file ke object URL + `HTMLImageElement`, lepas memori. |
| `lib/render.ts` | Render ke canvas, `toBlob`, nama file (unduhan lewat `lib/files.ts`). |
| `lib/*.test.ts` | Test geometri, crop, reducer. |

## Model data

```ts
CollageSettings { rows, cols, ratioW, ratioH, gap, padding, radius, background, longEdge, format, fit: "cover" | "contain" }
Photo   { id, name, url /* object URL */, width, height, image /* HTMLImageElement */ }
Cell    { photoId: string | null, framing: { zoom: 1..4, x: -1..1, y: -1..1, fit?: "cover" | "contain" /* kosong = ikut settings.fit */ } }
State   { settings, photos: Photo[], cells: Cell[] /* rows*cols, urut baris */, selected: number | null }
```

- **Unit kolase:** `gap`, `padding`, `radius` dalam 1/1000 sisi terpendek kanvas, jadi tampilannya sama di pratinjau maupun di ekspor 4096 px.
- **Framing ternormalisasi:** `x`, `y` di -1..1 (0 = tengah), tidak bergantung resolusi. Rumus tunggal `offset = (ukuranSel − ukuranFoto) × (1 + x) / 2` berlaku untuk dua keadaan: bila foto lebih besar dari sel, x memilih bagian yang terlihat; bila lebih kecil (mode Utuh), x memilih letak foto di sel. `panBy` membalik rumus ini sehingga foto selalu bergerak searah seretan.

## Alur penting

- **WYSIWYG:** pratinjau (DOM) dan ekspor (canvas) sama-sama memakai `cellRects`, `placeImage`, dan `visibleArea`. Ubah geometri hanya di `lib/`, jangan di komponen.
- **Isi vs utuh:** `placeImage` memakai skala `max(sel/foto)` untuk cover dan `min(sel/foto)` untuk contain, lalu dikali zoom. Zoom di mode Utuh bisa membuat foto melewati sel lagi (lalu terpotong).
- **Sudut membulat** dipotong pada `visibleArea` (irisan sel dan foto), bukan pada sel, sehingga foto utuh yang lebih kecil dari selnya tetap bersudut bulat. Di DOM ini adalah `.cell__frame`; di canvas, path klip sebelum `drawImage`.
- **Mengganti mode per sel** mengembalikan zoom dan posisi ke tengah agar hasilnya langsung terlihat; "Tengahkan" mempertahankan mode sel.
- **Ekspor:** `snapRect` membulatkan tepi sel ke piksel penuh agar tidak ada garis tipis saat jarak 0. Sel dipotong dengan path sudut membulat (`arcTo`, tanpa bergantung pada `roundRect`).
- **Grid berubah:** sel lama dipertahankan sesuai urutan baca; foto yang belum dipakai mengisi sel kosong berikutnya; sisanya tetap di tray dengan catatan "N foto belum dipakai".
- **Memori:** `releasePhoto` dipanggil saat hapus, saat mulai ulang, dan saat unmount. Kanvas ekspor dikecilkan ke 0×0 setelah `toBlob`.

## Batasan

- HEIC/HEIF hanya bisa dibaca di browser yang mendukungnya (Safari). Di browser lain muncul pesan "ubah ke JPG dulu".
- 4096 px adalah batas sisi terpanjang; kanvas lebih besar bisa gagal di Safari iOS.
- Orientasi EXIF mengikuti perilaku browser (modern: otomatis diterapkan).
- State tidak disimpan: menutup atau me-reload tab menghapus pekerjaan. Ini disengaja (tidak menyimpan data user).

## Ide pengembangan

- Tata letak non-seragam (satu foto besar + beberapa kecil): tambahkan tipe layout di `lib/layout.ts` yang mengembalikan `Rect[]` sendiri; sisa sistem sudah bekerja per `Rect`.
- Tukar sel dengan menyeret langsung di kanvas (saat ini lewat tray).
- Teks/keterangan di atas kolase.
