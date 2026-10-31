/**
 * Membuat QR code dengan qrcode-generator lalu menggambarnya sendiri (SVG/kanvas), supaya warna,
 * tepi kosong, dan ukuran bisa diatur. Semua di browser; isi QR tidak dikirim ke mana pun.
 */
import qrcode from "qrcode-generator";

// Bawaan pustaka memotong tiap karakter ke 1 byte; pakai UTF-8 agar huruf non-ASCII tetap terbaca.
qrcode.stringToBytes = (text: string) => Array.from(new TextEncoder().encode(text));

export type Ecc = "L" | "M" | "Q" | "H";

/** Kapasitas mode byte di versi 40 (terbesar) untuk tiap tingkat koreksi. */
export const MAX_BYTES: Record<Ecc, number> = { L: 2953, M: 2331, Q: 1663, H: 1273 };

/** Tepi kosong (quiet zone) standar: 4 modul. */
export const QUIET_ZONE = 4;

export interface QrMatrix {
  /** Jumlah modul per sisi (21 untuk versi 1, +4 per versi). */
  size: number;
  version: number;
  modules: boolean[][];
}

export function byteLength(text: string) {
  return new TextEncoder().encode(text).length;
}

export function makeQr(text: string, ecc: Ecc): QrMatrix {
  if (byteLength(text) > MAX_BYTES[ecc]) throw new Error(`Isi terlalu panjang untuk satu QR code (maks. ${MAX_BYTES[ecc].toLocaleString("id-ID")} byte di tingkat ini).`);
  const qr = qrcode(0, ecc);
  qr.addData(text, "Byte");
  try {
    qr.make();
  } catch {
    throw new Error("Isi terlalu panjang untuk satu QR code.");
  }
  const size = qr.getModuleCount();
  const modules = Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => qr.isDark(row, col)));
  return { size, version: (size - 17) / 4, modules };
}

/** Path SVG modul gelap; modul berurutan di satu baris digabung jadi satu persegi panjang. Modul di `hole` dilewati. */
export function qrPath(modules: readonly boolean[][], margin: number, hole?: LogoBox | null) {
  const parts: string[] = [];
  const inHole = (x: number, y: number) => !!hole && x + margin >= hole.x && x + margin < hole.x + hole.size && y + margin >= hole.y && y + margin < hole.y + hole.size;
  modules.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x] || inHole(x, y)) continue;
      let end = x;
      while (end + 1 < row.length && row[end + 1] && !inHole(end + 1, y)) end++;
      parts.push(`M${x + margin} ${y + margin}h${end - x + 1}v1h-${end - x + 1}z`);
      x = end;
    }
  });
  return parts.join("");
}

/** Kotak logo di tengah QR, dalam satuan modul (sudah termasuk tepi kosong). */
export interface LogoBox {
  x: number;
  y: number;
  size: number;
}

/**
 * Batas lebar logo (relatif lebar QR) per tingkat ketahanan. Uji pindai dengan jsQR (logo hitam
 * pekat, 4 ukuran piksel per modul, isi pendek sampai 300 byte) masih terbaca sampai 0,22 (Sedang),
 * 0,28 (Tinggi), dan 0,28 (Maks.); batas di sini disisakan cadangan untuk kamera ponsel dan cetakan.
 * Rendah tidak punya cadangan untuk menutup modul, jadi logo tidak diizinkan.
 */
export const LOGO_MAX_SCALE: Record<Ecc, number> = { L: 0, M: 0.16, Q: 0.22, H: 0.25 };

/**
 * Kotak logo berpusat, lebarnya `scale` × lebar QR, dibulatkan ke modul utuh dengan paritas
 * yang sama dengan jumlah modul agar tepat di tengah grid. Modul di dalam kotak dikosongkan.
 */
export function logoBox(matrix: QrMatrix, margin: number, scale: number): LogoBox | null {
  if (scale <= 0) return null;
  let size = Math.max(3, Math.ceil(matrix.size * scale));
  if (size % 2 !== matrix.size % 2) size++;
  const offset = margin + (matrix.size - size) / 2;
  return { x: offset, y: offset, size };
}

/** Bagian modul QR yang tertutup logo (0–1). */
export function logoCoverage(matrix: QrMatrix, box: LogoBox | null) {
  return box ? (box.size * box.size) / (matrix.size * matrix.size) : 0;
}

/** Logo digambar di dalam kotak dengan jarak 1 modul dari tepinya, rasio dipertahankan. */
export function logoImageRect(box: LogoBox, aspect: number) {
  const inner = box.size - 2;
  const width = aspect >= 1 ? inner : inner * aspect;
  const height = aspect >= 1 ? inner / aspect : inner;
  return { x: box.x + (box.size - width) / 2, y: box.y + (box.size - height) / 2, width, height };
}

export interface QrStyle {
  margin: number;
  /** "#rrggbb". */
  foreground: string;
  /** "#rrggbb" atau "transparent". */
  background: string;
}

export interface QrLogo {
  /** Data URL PNG (disematkan di file SVG, jadi bukan object URL). */
  href: string;
  /** Lebar/tinggi gambar logo. */
  aspect: number;
  box: LogoBox;
}

/** File SVG mandiri, berskala bebas. */
export function qrSvg(matrix: QrMatrix, style: QrStyle, logo?: QrLogo | null) {
  const side = matrix.size + style.margin * 2;
  const bg = style.background === "transparent" ? "" : `<rect width="${side}" height="${side}" fill="${style.background}"/>`;
  const rect = logo ? logoImageRect(logo.box, logo.aspect) : null;
  const image = logo && rect ? `<image href="${logo.href}" x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" shape-rendering="auto"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges">${bg}<path fill="${style.foreground}" d="${qrPath(matrix.modules, style.margin, logo?.box)}"/>${image}</svg>`;
}

/** Piksel per modul agar gambar mendekati `target` px tanpa modul berukuran pecahan. */
export function pixelsPerModule(matrix: QrMatrix, margin: number, target: number) {
  return Math.max(1, Math.round(target / (matrix.size + margin * 2)));
}

export type LinkResult = { ok: true; url: string } | { ok: false; error: string };

/** Tambah https:// bila user hanya menulis domain; tolak yang jelas bukan link. */
export function normalizeLink(input: string): LinkResult {
  const text = input.trim();
  if (!text) return { ok: false, error: "" };
  if (/\s/.test(text)) return { ok: false, error: "Link tidak boleh berisi spasi. Pakai mode Teks untuk kalimat." };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if ((url.protocol === "http:" || url.protocol === "https:") && !url.hostname.includes(".") && url.hostname !== "localhost")
      return { ok: false, error: "Link perlu nama domain lengkap, mis. contoh.com." };
    return { ok: true, url: withScheme };
  } catch {
    return { ok: false, error: "Ini bukan link yang valid." };
  }
}

/** Nama file dari isi: "https://contoh.com/promo" → "qr-contoh-com-promo". */
export function qrFilename(content: string) {
  const slug = content
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/^www\./i, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/, "");
  return slug ? `qr-${slug}` : "qr-code";
}

function luminance(hex: string) {
  const value = parseInt(hex.replace("#", ""), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((value >> 16) & 255) + 0.7152 * channel((value >> 8) & 255) + 0.0722 * channel(value & 255);
}

/**
 * Peringatan warna yang sering gagal dipindai: kontras rendah, atau kotak lebih terang dari latar
 * (QR terbalik tidak didukung semua pemindai). Latar transparan dinilai sebagai putih.
 */
export function colorWarning(foreground: string, background: string): string | null {
  const fg = luminance(foreground);
  const bg = background === "transparent" ? 1 : luminance(background);
  if (fg > bg) return "Kotak lebih terang dari latar. Sebagian pemindai tidak bisa membaca QR terbalik.";
  if ((bg + 0.05) / (fg + 0.05) < 4) return "Warna kotak dan latar terlalu mirip; QR bisa sulit dipindai.";
  return null;
}
