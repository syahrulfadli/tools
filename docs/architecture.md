# Arsitektur

## Gambaran

```
Browser ──► Cloudflare
              ├─ /api/*            → Worker (worker/index.ts)
              ├─ /assets/*, file   → Workers Static Assets (dist/client)
              └─ path lain         → index.html (SPA fallback) → React Router
```

- **Satu deploy.** `@cloudflare/vite-plugin` membangun frontend React dan Worker sekaligus. `wrangler deploy` mengunggah keduanya.
- **Worker hanya untuk `/api/*`** (`run_worker_first`). Saat ini hanya ada `GET /api/health`. Rute baru ditambahkan di objek `routes` pada `worker/index.ts`.
- **Header keamanan** untuk aset statis ada di `public/_headers` (CSP, nosniff, referrer, permissions). Jika tool butuh domain eksternal (font, API), tambahkan domain itu ke CSP. `font-src` memuat `'self' data:` untuk font pdf.js.
- **Aset vendor** (`public/vendor/`, dibuat oleh `scripts/`) dilayani sebagai file statis biasa; saat ini cmap & font standar pdf.js.
- **PWA**: `public/manifest.webmanifest` + ikon di `public/icons/` + service worker `/sw.js` (lihat [PWA](#pwa-dan-offline)).

## Privasi: tidak ada penyimpanan

- File user dibaca dengan `URL.createObjectURL(file)` dan diproses di canvas. Tidak ada `fetch` yang mengirim file.
- Object URL dilepas (`URL.revokeObjectURL`) saat foto dihapus, saat "Mulai ulang", dan saat tool ditutup.
- Yang disimpan di browser hanya preferensi dan file aplikasi: pilihan tema (`localStorage["theme"]`, hanya bila user memilih Terang/Gelap), setelan terakhir Kolase (`localStorage["kolase:setelan:v1"]`), dan cache file aplikasi milik service worker. Tidak ada yang berisi file atau data user. Tool yang mengingat setelan memakai `src/lib/storage.ts` (aman bila penyimpanan diblokir) dan memeriksa nilai yang dibaca sebelum dipakai.
- Worker tidak punya binding penyimpanan. Jika suatu tool kelak butuh pemrosesan di server, proses di memori Worker lalu kembalikan hasilnya, tanpa menulis ke storage atau log, dan dokumentasikan di docs tool tersebut.

## Routing dan skeleton

- `src/App.tsx` memakai `BrowserRouter` dengan tiga rute: `/` (Home, ada di bundle utama), `/tools/:slug`, dan `*` (404).
- Setiap tool dimuat dengan `React.lazy` (`lazyTool()` di registry) sehingga menjadi chunk terpisah.
- `<Suspense key={slug} fallback={<tool.Skeleton />}>`: karena di-*key* per slug, boundary selalu baru saat pindah tool, sehingga React menampilkan skeleton walaupun navigasi berjalan di dalam transition.
- `SkeletonPage` menampilkan garis progres 2px di puncak jendela plus `aria-busy` untuk pembaca layar.
- Home memanggil `preloadTool()` saat baris tool di-hover atau difokus, jadi chunk sering sudah siap sebelum diklik. Chunk yang sudah termuat tidak memicu skeleton lagi.
- `RouteErrorBoundary` menangkap kegagalan memuat chunk (mis. chunk lama hilang setelah deploy) dan menawarkan muat ulang.

## Proses yang terlihat di dalam tool

Selain skeleton antar halaman, setiap proses yang memakan waktu wajib terlihat:

- Memuat file: hitungan "Memuat foto 2 dari 5…" dan placeholder di posisi hasilnya.
- Ekspor: tombol berubah jadi "Merender…" dengan spinner dan nonaktif, lalu status "Diunduh <nama file> · <ukuran>".
- Konversi banyak item: progres "3/12" di tombol utama, pesan di bar, dan tombol Batal bila lama (PDF).
- Kegagalan: pesan di blok yang gagal, bukan banner layar penuh.

## State yang bertahan antar halaman

State React hilang saat tool unmount (user kembali ke home). Tool yang harus terus berjalan, seperti Timer, menyimpan state di **store modul** (variabel di modul + `useSyncExternalStore`), contohnya `src/tools/timer/lib/store.ts`. State itu tetap di memori tab saja, tidak ke server atau localStorage, dan hilang saat tab ditutup atau dimuat ulang.

## Kategori

`src/tools/categories.ts` berisi kategori (`id`, `name`, `description`). `ToolDefinition.category` wajib salah satu `id` itu (dicek TypeScript). Home menampilkan filter kategori (tersimpan di `?kategori=`) dan mengelompokkan hasil per kategori dengan `groupByCategory()`. Nama kategori ikut dicari.

## Pencarian

`searchTools()` di `src/tools/registry.ts`: setiap kata harus muncul di nama, deskripsi, nama kategori, slug, atau `keywords` (tanpa beda huruf besar/kecil dan aksen). Kata kunci tersimpan di `?q=` agar bisa dibagikan. `/` memfokuskan kotak cari, Enter membuka hasil pertama, Esc mengosongkan.

## Tema

Tiga pilihan di bar atas home/404 (`ThemeSwitch`): Terang, Gelap, Ikuti sistem (bawaan).

- `public/theme-init.js` dimuat di `<head>` (blocking, sebelum CSS dirender) dan memasang `data-theme="light|dark"` di `<html>` agar tidak ada kedipan tema terang. File terpisah karena CSP melarang skrip inline.
- `src/lib/theme.ts` (store modul + `useSyncExternalStore`) mengurus perubahan berikutnya: pilihan user, perubahan tema OS saat mode sistem, dan sinkron antar tab lewat event `storage`. Saat berganti, class `theme-switching` mematikan transisi CSS sebentar supaya semua warna berganti serempak.
- `<meta name="theme-color">` ikut diganti ke `--ground` tema aktif (warna bar status / judul jendela aplikasi terpasang).
- Warna gelap hanya menimpa token di `src/styles/tokens.css` (`:root[data-theme="dark"]`). Lihat [design-system.md](design-system.md#tema-gelap).

## PWA dan offline

Aplikasi bisa dipasang ke layar utama Android, iOS/iPadOS, dan Windows/macOS/ChromeOS (Chrome, Edge).

| Bagian | File |
| --- | --- |
| Manifest (nama, warna, `display: standalone`, ikon) | `public/manifest.webmanifest`, ditautkan dari `index.html` |
| Ikon PNG 192/512 (`any` + `maskable`) dan `apple-touch-icon` 180 | `public/icons/`, dibuat ulang dengan `npm run icons` (`scripts/make-icons.mjs`) |
| Templat service worker | `src/service-worker.js` |
| Daftar precache + versi cache | plugin `serviceWorker` di `vite.config.ts` → `dist/client/sw.js` |
| Pendaftaran SW, tombol "Pasang aplikasi" | `src/lib/pwa.ts`, `src/components/InstallButton.tsx` |

- **Pemasangan.** Chrome/Edge mengirim `beforeinstallprompt`; event ditahan dan tombol "Pasang aplikasi" di bar atas membuka dialog bawaan browser. Safari iOS tidak punya dialog, jadi tombolnya menampilkan petunjuk Bagikan → Tambah ke Layar Utama. Tombol tidak tampil bila sudah berjalan sebagai aplikasi terpasang.
- **Precache.** Saat SW dipasang, shell `/`, file public penting (manifest, favicon, `theme-init.js`, ikon), dan semua JS/CSS/aset hasil build (termasuk worker pdf.js) di-cache. Hasilnya semua tool bisa dibuka offline setelah kunjungan pertama.
- **Strategi.** Navigasi: jaringan dulu, shell dari cache bila offline. File lain dari origin sendiri: cache dulu; `/assets/*` dan `/vendor/*` yang belum ada disimpan saat pertama diambil. `/api/*` dan origin lain (Google Fonts) tidak disentuh; offline, font jatuh ke font sistem. Pencocokan cache memakai `ignoreVary` karena chunk JS diminta dalam mode CORS.
- **Versi.** Nama cache `tools-<hash>`; hash dari isi semua file build, file public di daftar precache, dan templat SW. SW baru langsung aktif (`skipWaiting` + `clients.claim`) dan menghapus cache lama. Halaman lama yang lalu gagal memuat chunk ditangani `RouteErrorBoundary` (muat ulang).
- **Dev.** SW hanya didaftarkan di build produksi (`import.meta.env.PROD`). Uji dengan `npm run preview`. Untuk membuang SW lama di browser: DevTools → Application → Service workers → Unregister.
- **Header.** `public/_headers` memberi `/sw.js` dan manifest `Cache-Control: no-cache`. CSP tidak perlu diubah: `worker-src` dan `manifest-src` jatuh ke `'self'`.
- **Menambah file public** yang harus tersedia offline sejak awal: tambahkan path-nya ke `PUBLIC_PRECACHE` di `vite.config.ts`.
