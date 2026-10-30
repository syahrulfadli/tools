/**
 * Pilihan halaman sebagai teks: "1-3, 8, 10-12". Halaman dihitung mulai 1.
 */

export type ParseResult = { ok: true; pages: number[] } | { ok: false; error: string };

export function parsePageRanges(text: string, pageCount: number): ParseResult {
  const pages = new Set<number>();
  const parts = text.replace(/\s*[-–]\s*/g, "-").split(/[,;\s]+/).filter(Boolean);
  if (parts.length === 0) return { ok: false, error: "Tulis nomor halaman, mis. 1-3, 8." };

  for (const part of parts) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!match) return { ok: false, error: `“${part}” bukan nomor atau rentang halaman.` };
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    const [lo, hi] = start <= end ? [start, end] : [end, start];
    if (lo < 1 || hi > pageCount) return { ok: false, error: `Halaman hanya 1 sampai ${pageCount}.` };
    for (let page = lo; page <= hi; page++) pages.add(page);
  }
  return { ok: true, pages: [...pages].sort((a, b) => a - b) };
}

/** Kebalikan dari parse: [1,2,3,8] → "1-3, 8". */
export function formatPageRanges(pages: Iterable<number>): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
    ranges.push(start === sorted[i] ? `${start}` : `${start}-${sorted[i]}`);
  }
  return ranges.join(", ");
}

/** Nama file halaman dengan nomor sepanjang jumlah digit halaman terbanyak, agar urut di folder. */
export function pageFilename(base: string, page: number, pageCount: number) {
  const digits = String(pageCount).length;
  return `${base}-hal-${String(page).padStart(digits, "0")}.jpg`; // taste-skill-ignore: nomor halaman di nama file
}
