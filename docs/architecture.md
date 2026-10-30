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

## Privasi: tidak ada penyimpanan

- File user dibaca dengan `URL.createObjectURL(file)` dan diproses di canvas. Tidak ada `fetch` yang mengirim file.
- Object URL dilepas (`URL.revokeObjectURL`) saat foto dihapus, saat "Mulai ulang", dan saat tool ditutup.
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

## Kategori

`src/tools/categories.ts` berisi kategori (`id`, `name`, `description`). `ToolDefinition.category` wajib salah satu `id` itu (dicek TypeScript). Home menampilkan filter kategori (tersimpan di `?kategori=`) dan mengelompokkan hasil per kategori dengan `groupByCategory()`. Nama kategori ikut dicari.

## Pencarian

`searchTools()` di `src/tools/registry.ts`: setiap kata harus muncul di nama, deskripsi, nama kategori, slug, atau `keywords` (tanpa beda huruf besar/kecil dan aksen). Kata kunci tersimpan di `?q=` agar bisa dibagikan. `/` memfokuskan kotak cari, Enter membuka hasil pertama, Esc mengosongkan.
