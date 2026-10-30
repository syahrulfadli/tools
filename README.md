# Productivity Tools

Kumpulan tools receh untuk produktivitas harian. Berjalan di Cloudflare Workers; semua file diproses di browser dan tidak pernah disimpan.

## Tools

| Tool | Kategori | Rute | Docs |
| --- | --- | --- | --- |
| Kolase Foto | Edit Gambar | `/tools/kolase` | [src/tools/collage/docs](src/tools/collage/docs/README.md) |
| PDF ke Gambar (JPEG/PNG) | File Converter | `/tools/pdf-ke-gambar` | [src/tools/pdf-to-image/docs](src/tools/pdf-to-image/docs/README.md) |
| Gambar ke PDF (JPEG, PNG, …) | File Converter | `/tools/gambar-ke-pdf` | [src/tools/image-to-pdf/docs](src/tools/image-to-pdf/docs/README.md) |
| Word ke PDF (.docx) | File Converter | `/tools/word-ke-pdf` | [src/tools/word-to-pdf/docs](src/tools/word-to-pdf/docs/README.md) |
| PNG ke JPEG | File Converter | `/tools/png-ke-jpg` | [src/tools/png-to-jpg/docs](src/tools/png-to-jpg/docs/README.md) |
| Gabung PDF | Olah PDF | `/tools/gabung-pdf` | [src/tools/merge-pdf/docs](src/tools/merge-pdf/docs/README.md) |
| Pisah PDF | Olah PDF | `/tools/pisah-pdf` | [src/tools/split-pdf/docs](src/tools/split-pdf/docs/README.md) |
| Kompres Gambar | Kompres | `/tools/kompres-gambar` | [src/tools/compress-image/docs](src/tools/compress-image/docs/README.md) |
| Kompres PDF | Kompres | `/tools/kompres-pdf` | [src/tools/compress-pdf/docs](src/tools/compress-pdf/docs/README.md) |
| Timer & Stopwatch | Waktu | `/tools/timer` | [src/tools/timer/docs](src/tools/timer/docs/README.md) |
| Jam Dunia | Waktu | `/tools/jam-dunia` | [src/tools/world-clock/docs](src/tools/world-clock/docs/README.md) |

## Pasang sebagai aplikasi

Productivity Tools adalah PWA: setelah dibuka sekali, semua tool bisa dipakai tanpa internet.

- **Android (Chrome/Edge)** dan **Windows/macOS (Chrome/Edge)**: tombol **Pasang aplikasi** di bar atas home, atau ikon pasang di bilah alamat.
- **iPhone/iPad (Safari)**: Bagikan → **Tambah ke Layar Utama**.

Tema terang, gelap, atau ikuti sistem dipilih di bar atas home.

## Mulai

```bash
npm install
npm run dev       # http://localhost:5173
npm test
npm run deploy    # butuh `npx wrangler login` sekali
```

## Dokumentasi

- [CLAUDE.md](CLAUDE.md): aturan proyek dan peta file (juga untuk AI agent).
- [docs/architecture.md](docs/architecture.md)
- [docs/adding-a-tool.md](docs/adding-a-tool.md)
- [docs/design-system.md](docs/design-system.md)
