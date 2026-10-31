/**
 * Ukuran SVG: membaca `width`/`height`/`viewBox` di elemen akar dan menghitung ukuran
 * piksel hasil. Fungsi murni (tanpa DOM) agar bisa diuji di Node.
 */
import { canvasLimitFactor } from "../../../lib/canvas";

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IntrinsicSize {
  width: number;
  height: number;
  /** false bila SVG tidak menulis ukuran maupun viewBox, sehingga dipakai 300 × 150 (bawaan browser). */
  declared: boolean;
}

export type Sizing = { mode: "scale"; scale: number } | { mode: "width"; width: number };

/** Piksel per satuan CSS. `em`/`ex` memakai ukuran huruf bawaan 16 px. */
const UNITS: Record<string, number> = {
  "": 1,
  px: 1,
  pt: 4 / 3,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / 101.6,
  em: 16,
  rem: 16,
  ex: 8,
};

/** "12pt" → 16, "100" → 100. Persen, `auto`, nol, negatif, atau satuan tak dikenal → null. */
export function parseLength(value: string | null | undefined): number | null {
  const match = value?.trim().match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([a-z]*)$/i);
  if (!match) return null;
  const factor = UNITS[match[2].toLowerCase()];
  const number = Number(match[1]) * (factor ?? NaN);
  return Number.isFinite(number) && number > 0 ? number : null;
}

/** "0 0 24 24" atau "0,0,24,24" → ViewBox; lebar/tinggi tidak positif → null. */
export function parseViewBox(value: string | null | undefined): ViewBox | null {
  const parts = value?.trim().split(/[\s,]+/).map(Number);
  if (!parts || parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [x, y, width, height] = parts;
  return width > 0 && height > 0 ? { x, y, width, height } : null;
}

/**
 * Ukuran asli SVG seperti yang dipakai browser untuk `<img>`: width/height bila tertulis,
 * sisi yang hilang mengikuti rasio viewBox, tanpa keduanya memakai viewBox, dan tanpa apa pun 300 × 150.
 */
export function intrinsicSize(attrs: { width?: string | null; height?: string | null; viewBox?: string | null }): IntrinsicSize {
  const width = parseLength(attrs.width);
  const height = parseLength(attrs.height);
  const box = parseViewBox(attrs.viewBox);
  const ratio = box ? box.width / box.height : null;
  if (width && height) return { width, height, declared: true };
  if (width && ratio) return { width, height: width / ratio, declared: true };
  if (height && ratio) return { width: height * ratio, height, declared: true };
  if (box) return { width: box.width, height: box.height, declared: true };
  return { width: width ?? 300, height: height ?? 150, declared: Boolean(width || height) };
}

/** Ukuran piksel hasil: skala atau lebar tetap (tinggi mengikuti rasio), lalu dibatasi agar kanvas aman. */
export function outputSize(size: { width: number; height: number }, sizing: Sizing) {
  const factor = sizing.mode === "scale" ? sizing.scale : sizing.width / size.width;
  const width = size.width * factor;
  const height = size.height * factor;
  const limit = canvasLimitFactor(width, height);
  return { width: Math.max(1, Math.round(width * limit)), height: Math.max(1, Math.round(height * limit)), limited: limit < 1 };
}
