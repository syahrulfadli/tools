import type { ComponentType } from "react";
import type { CategoryId } from "./categories";

/**
 * Kontrak satu tool. Setiap tool hidup di `src/tools/<slug>/` dan mengekspor satu
 * `ToolDefinition` dari `index.ts`-nya, lalu didaftarkan di `registry.ts`.
 * Lihat docs/adding-a-tool.md.
 */
export interface ToolDefinition {
  /** Dipakai sebagai URL: /tools/<slug>. Huruf kecil dan tanda hubung. */
  slug: string;
  name: string;
  /** Satu kalimat: apa yang dihasilkan tool ini. Tampil di home dan dicari. */
  description: string;
  /** Id kategori dari `categories.ts`. */
  category: CategoryId;
  /** Kata kunci tambahan untuk pencarian (sinonim, bahasa Inggris, istilah populer). */
  keywords: string[];
  /** Import dinamis komponen tool; jadi chunk terpisah yang dimuat saat dibuka. */
  load: () => Promise<{ default: ComponentType }>;
  /** Skeleton yang meniru layout tool; tampil selama chunk dimuat. Harus ringan. */
  Skeleton: ComponentType;
  /** Gambar mini hasil tool untuk baris di home. SVG kecil, tanpa aset eksternal. */
  Preview: ComponentType;
}
