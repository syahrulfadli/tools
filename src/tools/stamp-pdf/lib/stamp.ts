/**
 * Tata letak nomor halaman dan watermark. Fungsi murni; semua posisi dalam poin PDF di
 * ruang tampilan halaman (kiri bawah = 0,0, lihat src/lib/pdf-geometry.ts).
 */
import { rotateVector } from "../../../lib/pdf-geometry";

export type NumberFormat = "n" | "n-of" | "page-n" | "page-n-of";
export type Vertical = "top" | "bottom";
export type Horizontal = "left" | "center" | "right";

export interface NumberOptions {
  enabled: boolean;
  format: NumberFormat;
  vertical: Vertical;
  horizontal: Horizontal;
  /** Ukuran huruf, poin. */
  size: number;
  /** Jarak dari tepi halaman, milimeter. */
  marginMm: number;
  /** Halaman pertama (mulai 1) yang diberi nomor; halaman sebelumnya (mis. sampul) dilewati. */
  startPage: number;
  /** Nomor yang tertulis di `startPage`. */
  firstNumber: number;
}

export type WatermarkKind = "text" | "image";

/** Gambar watermark yang sudah diubah ke PNG (lihat `image.ts`). */
export interface WatermarkImage {
  png: Uint8Array;
  /** Piksel. */
  width: number;
  height: number;
}

export interface WatermarkOptions {
  enabled: boolean;
  kind: WatermarkKind;
  text: string;
  /** Ukuran huruf watermark teks, poin. */
  size: number;
  /** Watermark gambar; null bila belum dipilih. */
  image: WatermarkImage | null;
  /** Ukuran watermark gambar: muat di dalam kotak sebesar pecahan ini dari lebar dan tinggi halaman (0–1). */
  scale: number;
  /** 0–1. */
  opacity: number;
  /** Derajat, berlawanan jarum jam (45 = miring dari kiri bawah ke kanan atas). */
  angle: number;
  /** "#rrggbb". */
  color: string;
}

export const NUMBER_FORMATS: { value: NumberFormat; label: string }[] = [
  { value: "n", label: "1" },
  { value: "n-of", label: "1 / 10" },
  { value: "page-n", label: "Halaman 1" },
  { value: "page-n-of", label: "Halaman 1 dari 10" },
];

/** Tinggi huruf kapital Helvetica relatif terhadap ukuran huruf (AFM: CapHeight 718). */
export const CAP_HEIGHT = 0.718;
export const PT_PER_MM = 72 / 25.4;

export function formatPageNumber(format: NumberFormat, n: number, last: number) {
  switch (format) {
    case "n":
      return `${n}`;
    case "n-of":
      return `${n} / ${last}`;
    case "page-n":
      return `Halaman ${n}`;
    case "page-n-of":
      return `Halaman ${n} dari ${last}`;
  }
}

/** Nomor untuk halaman `page` (mulai 1), atau null bila halaman itu dilewati. */
export function pageNumberFor(page: number, options: Pick<NumberOptions, "startPage" | "firstNumber">) {
  return page < options.startPage ? null : options.firstNumber + (page - options.startPage);
}

/** Nomor terakhir (untuk format "dari N"). */
export function lastPageNumber(pageCount: number, options: Pick<NumberOptions, "startPage" | "firstNumber">) {
  return options.firstNumber + Math.max(0, pageCount - options.startPage);
}

/** Titik awal garis dasar teks nomor halaman. */
export function numberOrigin(page: { width: number; height: number }, textWidth: number, options: Pick<NumberOptions, "size" | "marginMm" | "vertical" | "horizontal">) {
  const margin = options.marginMm * PT_PER_MM;
  const x = options.horizontal === "left" ? margin : options.horizontal === "right" ? page.width - margin - textWidth : (page.width - textWidth) / 2;
  const y = options.vertical === "bottom" ? margin : page.height - margin - options.size * CAP_HEIGHT;
  return { x, y };
}

/** Titik awal kotak `width`×`height` (diputar `angle` pada sudut kiri bawahnya) agar tengahnya tepat di tengah halaman. */
export function centeredOrigin(page: { width: number; height: number }, width: number, height: number, angle: number) {
  const center = rotateVector(width / 2, height / 2, angle);
  return { x: page.width / 2 - center.x, y: page.height / 2 - center.y };
}

/** Titik awal teks watermark agar tengah teks (yang diputar `angle`) tepat di tengah halaman. */
export function watermarkOrigin(page: { width: number; height: number }, textWidth: number, size: number, angle: number) {
  return centeredOrigin(page, textWidth, size * CAP_HEIGHT, angle);
}

/** Ukuran watermark gambar (poin): muat di kotak `scale` × halaman, rasio gambar tetap. */
export function imageWatermarkSize(page: { width: number; height: number }, image: { width: number; height: number }, scale: number) {
  const fit = Math.min((page.width * scale) / image.width, (page.height * scale) / image.height);
  return { width: image.width * fit, height: image.height * fit };
}

/** Apakah watermark punya isi yang bisa ditulis (teks tidak kosong, atau gambar sudah dipilih). */
export function hasWatermark(watermark: WatermarkOptions) {
  if (!watermark.enabled) return false;
  return watermark.kind === "image" ? watermark.image !== null : watermark.text.trim() !== "";
}

/**
 * Karakter yang tidak bisa ditulis font standar PDF (Helvetica, pengodean WinAnsi):
 * ASCII, Latin-1, dan beberapa tanda baca Windows-1252 saja. Tanpa duplikat.
 */
export function unsupportedChars(text: string) {
  const bad = new Set<string>();
  for (const char of text) if (!isWinAnsi(char)) bad.add(char);
  return [...bad];
}

const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

function isWinAnsi(char: string) {
  const code = char.codePointAt(0) ?? 0;
  return (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.has(char);
}

/** "#1b6c80" → komponen 0–1 untuk `rgb()` pdf-lib. Nilai tidak sah jadi hitam. */
export function hexToRgb(hex: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const value = match ? parseInt(match[1], 16) : 0;
  return { r: ((value >> 16) & 255) / 255, g: ((value >> 8) & 255) / 255, b: (value & 255) / 255 };
}
