/**
 * Menyusun teks dari potongan teks pdf.js. PDF tidak menyimpan "baris" atau "spasi"; hanya
 * potongan teks dengan posisi. Baris dan paragraf ditebak dari posisi vertikal, spasi dari jarak
 * horizontal. Fungsi murni.
 */

export interface TextItem {
  str: string;
  /** Posisi garis dasar, poin PDF (y ke atas). */
  x: number;
  y: number;
  width: number;
  /** Tinggi huruf; 0 bila tidak diketahui. */
  height: number;
  /** pdf.js menandai potongan terakhir di satu baris. */
  hasEOL: boolean;
}

/** Satu halaman → baris teks. String kosong menandai jeda paragraf. */
export function itemsToLines(items: readonly TextItem[]): string[] {
  const lines: string[] = [];
  let line = "";
  let open = false;
  let lastY: number | null = null;
  let lastEnd: number | null = null;
  let lastSize = 0;

  const flush = () => {
    lines.push(line.replace(/\s+$/, ""));
    line = "";
    open = false;
    lastEnd = null;
  };

  for (const item of items) {
    const size = item.height || lastSize || 10;
    const ref = Math.max(size, lastSize);
    if (lastY !== null && Math.abs(item.y - lastY) > ref * 0.5) {
      if (open) flush();
      // Jarak antarbaris jauh lebih besar dari ukuran huruf → paragraf baru.
      if (lastY - item.y > ref * 1.8 && lines.length > 0 && lines[lines.length - 1] !== "") lines.push("");
    } else if (open && lastEnd !== null && item.str && item.x - lastEnd > size * 0.15 && !/\s$/.test(line) && !/^\s/.test(item.str)) {
      line += " ";
    }
    if (item.str) {
      line += item.str;
      open = true;
      lastEnd = item.x + item.width;
    }
    lastY = item.y;
    lastSize = size;
    if (item.hasEOL && open) flush();
  }
  if (open) flush();

  while (lines[0] === "") lines.shift();
  while (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/**
 * Gabung baris dalam satu paragraf jadi satu baris (untuk ditempel ke dokumen lain). Kata yang
 * terpotong tanda hubung di akhir baris disambung kembali.
 */
export function unwrapLines(lines: readonly string[]): string {
  const paragraphs: string[] = [];
  let current = "";
  for (const raw of lines) {
    const text = raw.trim();
    if (!text) {
      if (current) paragraphs.push(current);
      current = "";
    } else if (!current) current = text;
    else if (/[a-z]-$/i.test(current) && /^[a-z]/.test(text)) current = current.slice(0, -1) + text;
    else current += ` ${text}`;
  }
  if (current) paragraphs.push(current);
  return paragraphs.join("\n\n");
}

export interface FormatOptions {
  /** Tulis "--- Halaman n ---" sebelum isi tiap halaman. */
  markers: boolean;
  unwrap: boolean;
}

/** Teks akhir dari halaman terpilih (`pages`: nomor mulai 1 → baris). */
export function formatDocument(pages: ReadonlyMap<number, readonly string[]>, selection: readonly number[], options: FormatOptions) {
  return selection
    .filter((n) => pages.has(n))
    .map((n) => {
      const lines = pages.get(n) ?? [];
      const body = options.unwrap ? unwrapLines(lines) : lines.join("\n");
      return options.markers ? `--- Halaman ${n} ---\n${body}`.trimEnd() : body;
    })
    .filter((block) => block !== "")
    .join("\n\n");
}

export function textStats(text: string) {
  const words = text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu);
  return { chars: [...text].length, words: words?.length ?? 0 };
}
