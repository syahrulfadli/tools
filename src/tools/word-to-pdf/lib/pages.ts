/**
 * Ukuran halaman dokumen Word dan aturan @page untuk dialog cetak.
 * docx-preview menulis ukuran halaman sebagai `width`/`min-height` dalam pt.
 */

export interface PageSize {
  /** Dalam pt (1/72 inci). */
  width: number;
  height: number;
}

/** A4, ukuran bawaan Word bila dokumen tidak menyebut ukuran halaman. */
export const DEFAULT_PAGE: PageSize = { width: 595.3, height: 841.9 };

const MM = 72 / 25.4;

const NAMED: { label: string; width: number; height: number }[] = [
  { label: "A4", width: 210, height: 297 },
  { label: "F4", width: 215, height: 330 },
  { label: "Letter", width: 215.9, height: 279.4 },
  { label: "Legal", width: 215.9, height: 355.6 },
  { label: "A5", width: 148, height: 210 },
  { label: "A3", width: 297, height: 420 },
];

/** "595.30pt" → 595.3. Satuan lain (cm, mm, in, px) ikut diubah; nilai tak terbaca → null. */
export function parseLength(value: string): number | null {
  const match = /^\s*(-?[\d.]+)\s*(pt|px|mm|cm|in)?\s*$/.exec(value);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  const factor = { pt: 1, px: 0.75, mm: MM, cm: MM * 10, in: 72 }[match[2] ?? "pt"]!;
  return n * factor;
}

/** Ukuran dari gaya inline section docx-preview, A4 bila tidak ada. */
export function pageSizeOf(width: string, minHeight: string): PageSize {
  const w = parseLength(width);
  const h = parseLength(minHeight);
  return w && h ? { width: w, height: h } : DEFAULT_PAGE;
}

/** "A4 potret", "Letter lanskap", atau "210 × 140 mm" untuk ukuran lain (toleransi 2 mm). */
export function describePage(size: PageSize): string {
  const w = size.width / MM;
  const h = size.height / MM;
  const landscape = w > h;
  const [short, long] = landscape ? [h, w] : [w, h];
  const named = NAMED.find((page) => Math.abs(page.width - short) <= 2 && Math.abs(page.height - long) <= 2);
  if (!named) return `${Math.round(w)} × ${Math.round(h)} mm`;
  return `${named.label} ${landscape ? "lanskap" : "potret"}`;
}

const sameSize = (a: PageSize, b: PageSize) => Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;

/**
 * Aturan @page bernama per ukuran unik, tanpa margin cetak (margin dokumen sudah ada di
 * padding section). `names[i]` dipasang sebagai `page:` pada section ke-i.
 */
export function pageRules(sizes: PageSize[]): { css: string; names: string[] } {
  const unique: PageSize[] = [];
  const names = sizes.map((size) => {
    let index = unique.findIndex((other) => sameSize(other, size));
    if (index < 0) index = unique.push(size) - 1;
    return `docx-page-${index}`;
  });
  const fmt = (n: number) => `${Math.round(n * 100) / 100}pt`;
  const first = unique[0] ?? DEFAULT_PAGE;
  const css = [
    // Cadangan untuk browser tanpa dukungan @page bernama.
    `@page { size: ${fmt(first.width)} ${fmt(first.height)}; margin: 0; }`,
    ...unique.map((size, i) => `@page docx-page-${i} { size: ${fmt(size.width)} ${fmt(size.height)}; margin: 0; }`),
  ].join("\n");
  return { css, names };
}

/**
 * Perkiraan jumlah lembar cetak untuk satu section. Isi yang lebih tinggi dari kertas
 * berlanjut ke lembar berikutnya dengan margin atas/bawah yang sama.
 */
export function printedSheets(contentHeight: number, pageHeight: number, paddingTop: number, paddingBottom: number): number {
  const body = pageHeight - paddingTop - paddingBottom;
  // Toleransi 1 pt untuk pembulatan subpiksel.
  if (body <= 0 || contentHeight <= pageHeight + 1) return 1;
  return Math.max(1, Math.ceil((contentHeight - paddingTop - paddingBottom - 1) / body));
}
