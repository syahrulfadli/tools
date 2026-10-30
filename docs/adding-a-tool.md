# Menambah tool baru

Contoh lengkap: `src/tools/collage/`. Ganti `<slug>` dengan nama URL tool (huruf kecil, tanda hubung).

## 1. Buat folder

```
src/tools/<slug>/
├── index.ts(x)         # ToolDefinition (wajib; .tsx bila skeleton ditulis inline)
├── <Nama>Tool.tsx      # komponen utama, export default (wajib, di-lazy-load)
├── <Nama>Skeleton.tsx  # skeleton layout tool (wajib)
├── Preview.tsx         # gambar mini SVG untuk baris di home (wajib)
├── <slug>.css          # gaya khusus tool, hanya memakai token
├── components/         # komponen UI tool
├── lib/                # logika murni + *.test.ts
└── docs/README.md      # dokumentasi tool (wajib)
```

## 2. Definisikan tool

```ts
// src/tools/<slug>/index.ts
import type { ToolDefinition } from "../types";
import { NamaSkeleton } from "./NamaSkeleton";
import { NamaPreview } from "./Preview";

export const nama: ToolDefinition = {
  slug: "<slug>",
  name: "Nama Tool",
  description: "Satu kalimat tentang apa yang dihasilkan.",
  category: "file-converter", // id dari src/tools/categories.ts
  keywords: ["sinonim", "english term"],
  load: () => import("./NamaTool"),
  Skeleton: NamaSkeleton,
  Preview: NamaPreview,
};
```

Daftarkan di `src/tools/registry.ts`:

```ts
export const tools: ToolDefinition[] = [collage, nama];
```

Tool otomatis muncul di home di bawah kategorinya, ikut filter kategori dan pencarian, punya rute `/tools/<slug>`, masuk `sitemap.xml`, dan punya HTML sendiri untuk SEO (`build/seo.ts`; tulis `slug`, `name`, `description`, `category` sebagai string satu baris).

### Kategori

Kategori ada di `src/tools/categories.ts`. Pakai yang ada bila cocok (converter format file → `file-converter`, olah/susun gambar → `image-editor`, gabung/pisah/susun/tandai PDF → `pdf-tools`, perkecil ukuran file → `compressor`, hitung/ukur waktu → `time`). Bila tidak ada, tambahkan entri baru (`id` kebab-case, `name`, satu kalimat `description`). Urutan array = urutan kelompok di home; kategori tanpa tool tidak tampil.

## 3. Aturan komponen tool

Mulai dari bahan bersama, jangan menulis ulang:

| Butuh | Pakai |
| --- | --- |
| Kerangka halaman | `<div className="tool" {...dropProps}>` + `ToolBar` + `<div className="tool-body tool-body--sidebar">` (panel 300 px + area kerja) |
| Panel & kontrol | `<aside className="panel">`, `PanelSection`, `Slider`, `Segmented`, `ColorSwatches`, `Toggle` dari `components/tool/controls`; `.chip` (base.css) untuk preset/filter |
| Area kerja | `<main className="panel workspace">`, `.workspace__head`, `.workspace__empty` (tombol besar keadaan kosong) |
| Input file | `useFilePicker`, `usePageFileDrop` (seret ke halaman + overlay), `usePasteFiles`, `FileDropzone`, `FailureList`; `.doc-card` (tool.css) untuk kartu satu dokumen yang terbuka |
| Keluaran | `downloadBlob`, `formatBytes`, `baseName`, `uniqueNamer`, `fileStamp` (`lib/files`), `createZip` (`lib/zip`), `canvasToBlob`/`canvasLimitFactor`/`releaseCanvas` (`lib/canvas`) |
| Satu PDF yang diolah | `usePdfDocument` (buka dengan pdf-lib + pdf.js, ukuran & rotasi tiap halaman), `useSinglePdfInput` (pilih/seret/tempel satu PDF), `usePdfThumbnails`, `usePageImage` (`components/tool/usePdfDocument`); `PdfDocumentCard`, `PdfWorkspaceState` (`components/tool/PdfDocument`). Contoh: `src/tools/arrange-pdf/` |
| Menulis teks/gambar di halaman PDF | `visualSize`, `toUserSpace` (`lib/pdf-geometry`): hitung posisi di halaman seperti terlihat, lalu petakan ke ruang PDF (menangani `/Rotate` dan CropBox). Contoh: `src/tools/stamp-pdf/lib/apply.ts` |
| Skeleton converter | `ConverterSkeleton` dengan judul dan nama seksi panel |

Contoh lengkap pola converter: `src/tools/png-to-jpg/`. Contoh tool yang mencetak HTML ke PDF lewat dialog cetak (iframe pratinjau + `@page`): `src/tools/word-to-pdf/`. Contoh tool tanpa file dengan state yang bertahan antar halaman (store modul + `useSyncExternalStore`): `src/tools/timer/`.

- Komponen utama wajib `export default` (syarat `React.lazy`).
- Render `<title>Nama Tool · Productivity Tools</title>` di dalam komponen (React 19 memindahkannya ke `<head>`).
- Tool editor memakai layout builder seperti kolase: bar 44px (tombol kembali, `h1` nama tool, pill status, aksi utama di kanan), lalu panel. Tool sederhana boleh memakai `AppFrame`.
- Hanya satu tombol utama (`btn btn--primary`) per layar.
- **Warna hanya lewat token** (`var(--...)`), termasuk di `Preview.tsx` untuk bagian yang mewakili UI. Warna heksadesimal di CSS tool tidak ikut berganti di tema gelap. Cek tool di kedua tema (pilihan tema di bar atas home).
- **Jangan menyimpan atau mengunggah file user.** Proses di browser. Lepas object URL saat tidak dipakai.
- Tampilkan progres untuk setiap proses yang lama (lihat [architecture.md](architecture.md#proses-yang-terlihat-di-dalam-tool)).

## 4. Skeleton

- Tool berpola panel + area kerja cukup memakai `ConverterSkeleton` (lihat `src/tools/png-to-jpg/index.tsx`).
- Layout lain: pakai `SkeletonPage`, `Bone` dari `src/components/Skeleton.tsx`.
- Tiru layout akhir dengan ukuran yang sama (pakai class CSS tool yang sama), tampilkan judul dan heading panel sebagai teks asli, ganti nilai/kontrol dengan `Bone`.
- Skeleton masuk bundle utama: jangan impor library berat di sana.

## 5. Logika dan test

Taruh perhitungan (geometri, parsing, konversi) di `lib/` sebagai fungsi murni dan beri test Vitest (`*.test.ts`). Jalankan `npm test` dan `npm run typecheck`.

## 6. Library pihak ketiga

- Impor hanya dari komponen tool (atau `lib/` tool) agar masuk chunk tool, bukan bundle utama.
- Bila library butuh aset statis (worker, font, wasm), layani dari domain sendiri dan periksa CSP di `public/_headers`. Contoh: pdf.js di `src/tools/pdf-to-image/docs/README.md`.
- Kunci versi mayor yang API-nya sudah diuji.
- Format file sederhana boleh ditulis sendiri bila menghemat dependensi besar (contoh: ZIP di `src/lib/zip.ts`, PDF di `src/tools/image-to-pdf/lib/pdf-writer.ts`), asalkan diuji dengan pembaca yang independen (pdf.js, Python `zipfile`).

### Satu tool per tujuan, bukan per format

Gabungkan konversi yang tujuannya sama ke satu tool dengan pilihan format, mis. **Gambar ke PDF** (JPEG, PNG, …) dan **PDF ke Gambar** (keluaran JPEG atau PNG), alih-alih tool terpisah per format.

## 7. Dokumentasi

Tulis `src/tools/<slug>/docs/README.md` dengan bagian: Fungsi, Cara pakai, Struktur file, Model data, Alur penting, Batasan, dan Ide pengembangan. Tambahkan tautannya di bagian Dokumentasi pada `CLAUDE.md`.
