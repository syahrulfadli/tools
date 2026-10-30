/**
 * Rencana pemisahan: PDF dibagi jadi beberapa kelompok halaman (nomor mulai 1).
 * Murni dan tanpa pdf-lib, jadi mudah diuji.
 */
import { formatPageRanges, parsePageRanges } from "../../pdf-to-image/lib/pages";

export type PlanResult = { ok: true; parts: number[][] } | { ok: false; error: string };

/** "1-3, 4-6, 9": tiap bagian yang dipisah koma jadi satu PDF. Halaman boleh tumpang tindih dan tidak harus lengkap. */
export function planRanges(text: string, pageCount: number): PlanResult {
  const tokens = text.split(/[,;]/).map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) return { ok: false, error: "Tulis rentang halaman, mis. 1-3, 4-6, 9." };
  const parts: number[][] = [];
  for (const token of tokens) {
    const result = parsePageRanges(token, pageCount);
    if (!result.ok) return result;
    parts.push(result.pages);
  }
  return { ok: true, parts };
}

/** Setiap `size` halaman jadi satu PDF; sisa di akhir jadi PDF terakhir. */
export function planEvery(size: number, pageCount: number): PlanResult {
  if (!Number.isInteger(size) || size < 1) return { ok: false, error: "Isi jumlah halaman dengan angka bulat, minimal 1." };
  const parts: number[][] = [];
  for (let start = 1; start <= pageCount; start += size) {
    parts.push(Array.from({ length: Math.min(size, pageCount - start + 1) }, (_, i) => start + i));
  }
  return { ok: true, parts };
}

/** Nama PDF hasil: "laporan" + [1,2,3,8] → "laporan-hal-1-3_8.pdf". */
export function partName(base: string, pages: number[]) {
  return `${base}-hal-${formatPageRanges(pages).replace(/, /g, "_")}.pdf`; // taste-skill-ignore: nomor halaman di nama file
}
