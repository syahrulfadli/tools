# Productivity Tools

Kumpulan tool kecil berbasis browser. React + TypeScript (frontend) dan Cloudflare Worker TypeScript (backend), satu proyek, satu deploy.

## Aturan yang tidak boleh dilanggar

1. **Tidak pernah menyimpan data user.** File yang diunggah user diproses di browser (canvas, object URL) dan tidak dikirim ke server. Jangan menambah binding KV/R2/D1/Durable Objects untuk data user. Respons `/api/*` selalu `Cache-Control: no-store`.
2. **Setiap tool punya folder `docs/` sendiri** (`src/tools/<slug>/docs/README.md`). Perbarui docs itu setiap kali perilaku tool berubah.
3. **Setiap tool punya skeleton** yang meniru layout akhirnya. Skeleton tampil selama chunk tool dimuat.
4. **Setiap tool masuk satu kategori** dari `src/tools/categories.ts` (mis. converter → `file-converter`). Buat kategori baru di sana bila belum ada yang cocok.
5. **UI mengikuti design system** di [docs/design-system.md](docs/design-system.md). Pakai token di `src/styles/tokens.css`, jangan warna heksadesimal di CSS komponen (agar tema gelap ikut berlaku). Jangan pakai gradien, glow, glass, emoji, label kecil huruf kapital, atau ikon di kotak berwarna.

## Peta proyek

| Path | Isi |
| --- | --- |
| `worker/index.ts` | Worker: hanya menangani `/api/*`. Aset statis dilayani Workers Static Assets. |
| `wrangler.jsonc` | Konfigurasi Cloudflare (SPA fallback, `run_worker_first: ["/api/*"]`). |
| `public/_headers` | Header keamanan + CSP + Permissions-Policy (lokasi diizinkan untuk situs sendiri, dipakai Jam Dunia). Tambah domain/sumber/izin baru di sini bila tool membutuhkannya. |
| `public/manifest.webmanifest`, `public/icons/` | Manifest PWA dan ikon PNG (dibuat `npm run icons` dari `scripts/make-icons.mjs`). |
| `public/theme-init.js` | Memasang `data-theme` sebelum render pertama (tanpa kedipan). Logikanya kembar dengan `src/lib/theme.ts`. |
| `build/seo.ts` | Plugin Vite: HTML per rute (meta, canonical, Open Graph, JSON-LD), `404.html`, `robots.txt`, `sitemap.xml`. Butuh `SITE_URL` saat build (lihat docs/architecture.md#seo). |
| `src/service-worker.js` | Templat service worker; plugin di `vite.config.ts` mengisi daftar precache dan menulis `dist/client/sw.js`. |
| `scripts/copy-pdfjs-assets.mjs` | Menyalin cmap & font standar pdf.js ke `public/vendor/pdfjs/` (otomatis di `predev`/`prebuild`, diabaikan git). |
| `src/App.tsx` | Routing (`/`, `/tools/:slug`, 404) dan boundary Suspense per tool. |
| `src/tools/registry.ts` | Daftar tool, pencarian, pengelompokan per kategori, lazy loading, preload. |
| `src/tools/categories.ts` | Daftar kategori (id, nama, deskripsi), urutan = urutan di home. |
| `src/tools/types.ts` | Kontrak `ToolDefinition`. |
| `src/tools/<slug>/` | Satu tool: `index.ts(x)`, komponen, `lib/`, skeleton, preview, `docs/`. |
| `src/components/` | Shell (`AppFrame` dengan `ThemeSwitch` + `InstallButton`, footer kredit + `NoahMark`), skeleton (`Bone`, `SkeletonPage`, `RouteProgress`), error boundary. |
| `src/components/tool/` | Bahan halaman tool: `ToolBar`, `PanelSection`/`Slider`/`Segmented`/`ColorSwatches`/`Toggle`, `FileDropzone`/`FailureList`, `usePageFileDrop`/`usePasteFiles`/`useFilePicker`, `ConverterSkeleton`. Untuk tool satu PDF: `usePdfDocument`/`useSinglePdfInput`/`usePdfThumbnails`/`usePageImage` dan `PdfDocumentCard`/`PdfWorkspaceState`. |
| `src/lib/` | Utilitas bersama: `files.ts` (unduh, ukuran, nama), `zip.ts` (ZIP tanpa dependensi), `canvas.ts` (batas kanvas, toBlob), `pdf-edit.ts` (pdf-lib: buka, gabung, pisah, susun ulang, ukuran halaman), `pdf-geometry.ts` (posisi di halaman terlihat → ruang PDF, termasuk halaman diputar), `theme.ts` (tema terang/gelap/sistem), `pwa.ts` (daftar SW, dialog pasang), `storage.ts` (localStorage aman untuk preferensi). |
| `src/styles/tool.css` | Kerangka & kontrol halaman tool (bar, panel, area kerja, responsif). |
| `src/pages/` | Home (hero + pencarian + filter kategori + daftar per kategori) dan 404. |
| `docs/` | Dokumentasi lintas tool. |

## Perintah

```bash
npm run dev        # Vite + Worker lokal (workerd) di http://localhost:5173
npm test           # Vitest: logika murni tiap tool
npm run typecheck  # tsc -b untuk app, worker, dan config
npm run build      # typecheck + build produksi ke dist/
npm run preview    # build lalu jalankan hasil produksi secara lokal
npm run deploy     # build + wrangler deploy
```

Setelah build ulang, restart `vite preview`: server lama memegang manifest aset lama dan menyajikan HTML untuk file JS/CSS.

Service worker (PWA) hanya aktif di build produksi, jadi uji offline/pemasangan lewat `npm run preview`, bukan `npm run dev`.

## Dokumentasi

- [docs/architecture.md](docs/architecture.md): alur request, routing, skeleton, privasi, tema, PWA & offline.
- [docs/adding-a-tool.md](docs/adding-a-tool.md): langkah menambah tool baru.
- [docs/design-system.md](docs/design-system.md): token, layout, aturan UI.
- Tool:
  - Edit Gambar → Kolase Foto: [src/tools/collage/docs/README.md](src/tools/collage/docs/README.md)
  - File Converter → PDF ke Gambar: [src/tools/pdf-to-image/docs/README.md](src/tools/pdf-to-image/docs/README.md)
  - File Converter → Gambar ke PDF: [src/tools/image-to-pdf/docs/README.md](src/tools/image-to-pdf/docs/README.md)
  - File Converter → Word ke PDF: [src/tools/word-to-pdf/docs/README.md](src/tools/word-to-pdf/docs/README.md)
  - File Converter → PNG ke JPEG: [src/tools/png-to-jpg/docs/README.md](src/tools/png-to-jpg/docs/README.md)
  - File Converter → PDF ke Teks: [src/tools/pdf-to-text/docs/README.md](src/tools/pdf-to-text/docs/README.md)
  - File Converter → QR Code: [src/tools/qr-code/docs/README.md](src/tools/qr-code/docs/README.md)
  - Olah PDF → Gabung PDF: [src/tools/merge-pdf/docs/README.md](src/tools/merge-pdf/docs/README.md)
  - Olah PDF → Pisah PDF: [src/tools/split-pdf/docs/README.md](src/tools/split-pdf/docs/README.md)
  - Olah PDF → Atur Halaman PDF: [src/tools/arrange-pdf/docs/README.md](src/tools/arrange-pdf/docs/README.md)
  - Olah PDF → Nomor Halaman & Watermark: [src/tools/stamp-pdf/docs/README.md](src/tools/stamp-pdf/docs/README.md)
  - Olah PDF → Tanda Tangan PDF: [src/tools/sign-pdf/docs/README.md](src/tools/sign-pdf/docs/README.md)
  - Kompres → Kompres Gambar: [src/tools/compress-image/docs/README.md](src/tools/compress-image/docs/README.md)
  - Kompres → Kompres PDF: [src/tools/compress-pdf/docs/README.md](src/tools/compress-pdf/docs/README.md)
  - Waktu → Timer & Stopwatch: [src/tools/timer/docs/README.md](src/tools/timer/docs/README.md)
  - Waktu → Pomodoro: [src/tools/pomodoro/docs/README.md](src/tools/pomodoro/docs/README.md)
  - Waktu → Jam Dunia: [src/tools/world-clock/docs/README.md](src/tools/world-clock/docs/README.md)

Baca docs tool terkait **sebelum** mengubah tool tersebut.
