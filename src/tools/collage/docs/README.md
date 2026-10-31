# Kolase Foto

Rute: `/tools/kolase` · Kategori: Edit Gambar (`image-editor`) · Definisi: `src/tools/collage/index.ts`

## Fungsi

Menggabungkan beberapa foto jadi satu gambar dalam grid R×K (1–8 baris, 1–8 kolom) dengan rasio siap unggah, lalu mengunduhnya sebagai PNG atau JPG, atau menyalinnya ke clipboard. Semua proses di browser; foto tidak pernah dikirim atau disimpan.

## Cara pakai

1. **Tambah foto:** tombol "Tambah foto", klik sel kosong, seret file ke halaman atau ke sel tertentu, atau tempel dari clipboard (Ctrl/⌘+V; masuk ke sel terpilih bila ada).
2. **Grid:** preset 1×2, 2×1, 2×2, 1×3, 3×1, 2×3, 3×2, 3×3, 4×4, atau stepper Baris/Kolom.
3. **Rasio:** 1:1, 4:5 (Instagram), 9:16 (Story), 3:4, 2:3 (Cetak 4R), 16:9, 4:3, 3:2, atau kustom (1–50 : 1–50).
4. **Jarak dan sudut:** jarak antar foto, tepi luar, sudut membulat.
5. **Foto di sel:** *Isi penuh* (bawaan) menutupi seluruh sel dan memotong tepi yang tidak muat; *Utuh* menampilkan seluruh foto tanpa dipotong, sisa ruang sel diisi warna latar. Setelan ini berlaku untuk semua sel (dan menghapus pilihan per sel); tiap sel bisa diubah sendiri di **Sel terpilih → Tampilan foto**.
6. **Bingkai foto:** garis di tepi dalam tiap foto, tebal 0–40 unit (0 = tanpa bingkai), warna putih, hitam, batu, atau warna bebas. Bingkai mengikuti sudut membulat dan, di mode Utuh, mengelilingi foto (bukan sel).
7. **Latar:** putih, hitam, batu, transparan (PNG saja), atau warna bebas.
8. **Atur foto di sel:** klik untuk memilih, seret untuk menggeser (di mode Utuh: memindah letak foto di dalam sel), zoom lewat slider, Ctrl/⌘+scroll, atau pinch di trackpad. Keyboard: panah menggeser, `+`/`-` zoom, Delete mengosongkan sel, Enter memilih/menambah.
9. **Tukar posisi:** seret thumbnail dari panel Foto ke sel lain. Jika foto sudah ada di sel lain, keduanya bertukar.
10. **Ekspor:** sisi terpanjang 1080 / 2048 / 4096 px, format PNG/JPG, lalu "Unduh". **Salin gambar** menyalin kolase ke clipboard untuk langsung ditempel di chat/dokumen tanpa mengunduh.
11. **Setelan tersimpan:** setelan terakhir diingat di browser ini (lihat *Penyimpanan setelan*). **Kembalikan ke bawaan** mengembalikan semua setelan dan menghapus yang tersimpan.

Di layar sentuh, ketukan pertama pada sel hanya memilih sel supaya halaman tetap bisa digulir; geser foto setelah sel terpilih.

## Struktur file

| File | Isi |
| --- | --- |
| `index.ts` | `ToolDefinition` (nama, kata kunci pencarian, lazy load). |
| `CollageTool.tsx` | Komponen utama: state, muat file, tempel, drop halaman, ekspor (unduh dan salin). Memakai `ToolBar`, `useFilePicker`, `usePageFileDrop`, `usePasteFiles` dari `components/tool/`. |
| `CollageSkeleton.tsx` | Skeleton saat chunk dimuat (memakai class CSS yang sama). |
| `Preview.tsx` | SVG mini untuk baris di home. |
| `collage.css` | Tiga kolom, preset grid/rasio, kanvas, tray. Kerangka & kontrol umum ada di `src/styles/tool.css`. |
| `components/CollageCanvas.tsx` | Pratinjau interaktif: ukuran pas well, seret/geser, zoom wheel, keyboard, drop per sel. |
| `components/SettingsPanel.tsx` | Panel kiri (Grid, Rasio, Foto di sel, Jarak dan sudut, Bingkai foto, Latar) dan `ExportSection`. |
| `components/PhotosPanel.tsx` | Panel kanan: tambah foto, tray, progres, kegagalan, sel terpilih, slot untuk Ekspor. |
| `components/Glyphs.tsx` | `GridGlyph`, `RatioGlyph`. |
| `lib/presets.ts` | Preset grid, rasio, ukuran, latar, batas slider. |
| `lib/layout.ts` | `CollageSettings`, `outputSize`, `cellRects`, `snapRect`, `cornerRadius`, `borderSize`. |
| `lib/crop.ts` | `Fit`, `Framing`, `placeImage`, `visibleArea`, `panBy`, `zoomTo`. |
| `lib/persist.ts` | `loadSettings`, `saveSettings`, `sanitizeSettings`, `isDefaultSettings` (+ test). |
| `lib/state.ts` | Reducer: foto, sel, pilihan, setelan. |
| `lib/images.ts` | Muat file ke object URL + `HTMLImageElement`, lepas memori. |
| `lib/render.ts` | Render ke canvas, `toBlob`, nama file (unduhan lewat `lib/files.ts`). |
| `lib/*.test.ts` | Test geometri, crop, reducer. |

## Model data

```ts
CollageSettings { rows, cols, ratioW, ratioH, gap, padding, radius, borderWidth, borderColor /* #rrggbb */, background, longEdge, format, fit: "cover" | "contain" }
Photo   { id, name, url /* object URL */, width, height, image /* HTMLImageElement */ }
Cell    { photoId: string | null, framing: { zoom: 1..4, x: -1..1, y: -1..1, fit?: "cover" | "contain" /* kosong = ikut settings.fit */ } }
State   { settings, photos: Photo[], cells: Cell[] /* rows*cols, urut baris */, selected: number | null }
```

- **Unit kolase:** `gap`, `padding`, `radius`, `borderWidth` dalam 1/1000 sisi terpendek kanvas, jadi tampilannya sama di pratinjau maupun di ekspor 4096 px.
- **Framing ternormalisasi:** `x`, `y` di -1..1 (0 = tengah), tidak bergantung resolusi. Rumus tunggal `offset = (ukuranSel − ukuranFoto) × (1 + x) / 2` berlaku untuk dua keadaan: bila foto lebih besar dari sel, x memilih bagian yang terlihat; bila lebih kecil (mode Utuh), x memilih letak foto di sel. `panBy` membalik rumus ini sehingga foto selalu bergerak searah seretan.

## Alur penting

- **WYSIWYG:** pratinjau (DOM) dan ekspor (canvas) sama-sama memakai `cellRects`, `placeImage`, dan `visibleArea`. Ubah geometri hanya di `lib/`, jangan di komponen.
- **Isi vs utuh:** `placeImage` memakai skala `max(sel/foto)` untuk cover dan `min(sel/foto)` untuk contain, lalu dikali zoom. Zoom di mode Utuh bisa membuat foto melewati sel lagi (lalu terpotong).
- **Sudut membulat** dipotong pada `visibleArea` (irisan sel dan foto), bukan pada sel, sehingga foto utuh yang lebih kecil dari selnya tetap bersudut bulat. Di DOM ini adalah `.cell__frame`; di canvas, path klip sebelum `drawImage`.
- **Bingkai foto** digambar di sisi dalam `visibleArea`, jadi tidak menambah ukuran sel dan tidak menimpa sel tetangga saat jarak 0. Tebalnya dibatasi `borderSize` ke setengah sisi terpendek. Di DOM: `.cell__border` (elemen di atas foto dengan `border` CSS, `border-radius: inherit`); di canvas: jalur klip yang sama di-`stroke` dengan tebal 2× sehingga separuh luarnya terpotong klip. Keduanya menghasilkan sudut dalam radius − tebal.
- **Mengganti mode per sel** mengembalikan zoom dan posisi ke tengah agar hasilnya langsung terlihat; "Tengahkan" mempertahankan mode sel.
- **Ekspor:** `snapRect` membulatkan tepi sel ke piksel penuh agar tidak ada garis tipis saat jarak 0. Sel dipotong dengan path sudut membulat (`arcTo`, tanpa bergantung pada `roundRect`).
- **Grid berubah:** sel lama dipertahankan sesuai urutan baca; foto yang belum dipakai mengisi sel kosong berikutnya; sisanya tetap di tray dengan catatan "N foto belum dipakai".
- **Salin gambar:** clipboard hanya menerima PNG, jadi `renderCollage` dipanggil dengan `type: "image/png"` walau format JPG dipilih. Latar tetap mengikuti format (transparen menjadi putih bila JPG), jadi tampilannya sama dengan unduhan. `ClipboardItem` diberi promise PNG agar izin clipboard tetap terikat ke klik user (syarat Safari). Ukuran ekspor yang dipilih tetap berlaku.
- **Memori:** `releasePhoto` dipanggil saat hapus, saat mulai ulang, dan saat unmount. Kanvas ekspor dikecilkan ke 0×0 setelah `toBlob`.

## Penyimpanan setelan

- Semua `CollageSettings` (grid, rasio, jarak/tepi/sudut, bingkai, latar, isi/utuh, ukuran dan format ekspor) disimpan di `localStorage["kolase:setelan:v1"]` lewat `src/lib/storage.ts`. Foto, urutan foto, dan pembingkaian per sel **tidak** disimpan.
- Disimpan 300 ms setelah perubahan terakhir, dan langsung saat tool ditutup atau halaman ditinggalkan (`pagehide`).
- Setelan yang sama dengan bawaan tidak disimpan: kuncinya dihapus.
- Saat dimuat, `sanitizeSettings` memeriksa setiap kolom (bilangan bulat dalam batas, warna `#rrggbb` atau `transparent` (bingkai hanya `#rrggbb`), opsi yang dikenal). Kolom yang tidak sah kembali ke bawaan dan kolom lain tetap dipakai; JSON rusak atau penyimpanan yang diblokir (mode privat) berarti setelan bawaan.
- Kolom baru (mis. `borderWidth`/`borderColor`) tidak butuh versi baru: setelan lama yang belum punya kolom itu memakai bawaannya.
- Bila arti sebuah kolom berubah, naikkan versi kunci (`v2`) di `STORAGE_KEY` agar setelan lama diabaikan.
- Dua tab Kolase yang terbuka bersamaan: tab yang terakhir menyimpan yang menang.

## Batasan

- HEIC/HEIF hanya bisa dibaca di browser yang mendukungnya (Safari). Di browser lain muncul pesan "ubah ke JPG dulu".
- 4096 px adalah batas sisi terpanjang; kanvas lebih besar bisa gagal di Safari iOS.
- Orientasi EXIF mengikuti perilaku browser (modern: otomatis diterapkan).
- Foto dan susunannya tidak disimpan: menutup atau me-reload tab menghapus pekerjaan. Ini disengaja (tidak menyimpan data user). Hanya setelan yang diingat.

## Ide pengembangan

- Tata letak non-seragam (satu foto besar + beberapa kecil): tambahkan tipe layout di `lib/layout.ts` yang mengembalikan `Rect[]` sendiri; sisa sistem sudah bekerja per `Rect`.
- Tukar sel dengan menyeret langsung di kanvas (saat ini lewat tray).
- Teks/keterangan di atas kolase.
