import type { Fit } from "./crop";

/**
 * Geometri kolase. Fungsi murni: dipakai pratinjau (DOM) dan ekspor (canvas) agar
 * hasil unduhan sama persis dengan yang terlihat.
 */

export interface CollageSettings {
  rows: number;
  cols: number;
  ratioW: number;
  ratioH: number;
  /** Jarak antar foto, tepi luar, dan sudut — dalam unit 1/1000 sisi terpendek. */
  gap: number;
  padding: number;
  radius: number;
  /** Warna CSS heksadesimal, atau "transparent" (hanya bermakna untuk PNG). */
  background: string;
  /** Sisi terpanjang hasil ekspor, piksel. */
  longEdge: number;
  format: "png" | "jpeg";
  /** Cara foto mengisi sel bila sel tidak mengatur sendiri: dipotong penuh atau utuh. */
  fit: Fit;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_SETTINGS: CollageSettings = {
  rows: 2,
  cols: 2,
  ratioW: 4,
  ratioH: 5,
  gap: 12,
  padding: 0,
  radius: 0,
  background: "#ffffff",
  longEdge: 2048,
  format: "png",
  fit: "cover",
};

/** Ukuran kanvas hasil untuk rasio dan sisi terpanjang tertentu (dibulatkan ke piksel). */
export function outputSize(ratioW: number, ratioH: number, longEdge: number) {
  if (ratioW >= ratioH) {
    return { width: longEdge, height: Math.max(1, Math.round((longEdge * ratioH) / ratioW)) };
  }
  return { width: Math.max(1, Math.round((longEdge * ratioW) / ratioH)), height: longEdge };
}

/** Ukuran satu unit kolase untuk kanvas berukuran tertentu. */
export function unitSize(width: number, height: number) {
  return Math.min(width, height) / 1000;
}

/**
 * Kotak tiap sel, urut baris demi baris (kiri ke kanan, atas ke bawah).
 * Jarak dan tepi diperkecil otomatis bila tidak muat, sehingga sel tidak pernah negatif.
 */
export function cellRects(
  width: number,
  height: number,
  { rows, cols, gap, padding }: Pick<CollageSettings, "rows" | "cols" | "gap" | "padding">,
): Rect[] {
  const unit = unitSize(width, height);
  const pad = Math.min(padding * unit, width / 4, height / 4);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const g = Math.min(gap * unit, cols > 1 ? innerW / (cols * 2) : Infinity, rows > 1 ? innerH / (rows * 2) : Infinity);
  const cellW = (innerW - g * (cols - 1)) / cols;
  const cellH = (innerH - g * (rows - 1)) / rows;

  const rects: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({ x: pad + c * (cellW + g), y: pad + r * (cellH + g), width: cellW, height: cellH });
    }
  }
  return rects;
}

/** Bulatkan tepi kotak ke piksel penuh: tanpa garis tipis di antara sel saat jarak 0. */
export function snapRect({ x, y, width, height }: Rect): Rect {
  const x0 = Math.round(x);
  const y0 = Math.round(y);
  return { x: x0, y: y0, width: Math.round(x + width) - x0, height: Math.round(y + height) - y0 };
}

/** Radius sudut dalam piksel, dibatasi setengah sisi terpendek sel. */
export function cornerRadius(radius: number, rect: Rect, unit: number) {
  return Math.min(radius * unit, rect.width / 2, rect.height / 2);
}

export function ratioLabel(w: number, h: number) {
  return `${w}:${h}`;
}
