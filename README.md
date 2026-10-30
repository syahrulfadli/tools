# Productivity Tools

Kumpulan tools receh untuk produktivitas harian. Berjalan di Cloudflare Workers; semua file diproses di browser dan tidak pernah disimpan.

## Tools

| Tool | Kategori | Rute | Docs |
| --- | --- | --- | --- |
| Kolase Foto | Edit Gambar | `/tools/kolase` | [src/tools/collage/docs](src/tools/collage/docs/README.md) |
| PDF ke JPEG | File Converter | `/tools/pdf-ke-jpg` | [src/tools/pdf-to-jpg/docs](src/tools/pdf-to-jpg/docs/README.md) |
| PNG ke JPEG | File Converter | `/tools/png-ke-jpg` | [src/tools/png-to-jpg/docs](src/tools/png-to-jpg/docs/README.md) |

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
