/**
 * Pembingkaian foto di dalam sel: mode isi/utuh + zoom + geser.
 *
 * - "cover" (Isi penuh): foto menutupi seluruh sel; tepi yang berlebih dipotong.
 * - "contain" (Utuh): seluruh foto terlihat; sisa ruang sel memperlihatkan warna latar.
 *
 * Posisi disimpan ternormalisasi (x, y di rentang -1..1, 0 = tengah) sehingga tidak
 * bergantung pada resolusi: pergeseran di pratinjau kecil menghasilkan hasil yang sama
 * di ekspor 4096 px. Pada sumbu di mana foto lebih besar dari sel, x/y memilih bagian
 * yang terlihat; pada sumbu di mana foto lebih kecil, x/y memilih letaknya di sel.
 * Keduanya memakai rumus yang sama: offset = ruangSisa × (1 + x) / 2.
 */

export type Fit = "cover" | "contain";

export interface Framing {
  /** 1 = pas dengan sel sesuai mode; 4 = diperbesar 4×. */
  zoom: number;
  x: number;
  y: number;
  /** Mode khusus sel ini; kosong = ikut setelan kolase. */
  fit?: Fit;
}

export const DEFAULT_FRAMING: Framing = { zoom: 1, x: 0, y: 0 };
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

/** Kotak foto relatif terhadap pojok kiri atas sel (bisa melewati tepi sel), plus skalanya. */
export interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export function placeImage(
  imgW: number,
  imgH: number,
  cellW: number,
  cellH: number,
  { zoom, x, y }: Framing,
  fit: Fit,
): Placement {
  const fitScale = fit === "cover" ? Math.max(cellW / imgW, cellH / imgH) : Math.min(cellW / imgW, cellH / imgH);
  const scale = fitScale * clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const width = imgW * scale;
  const height = imgH * scale;
  return {
    x: ((cellW - width) * (1 + clamp(x, -1, 1))) / 2,
    y: ((cellH - height) * (1 + clamp(y, -1, 1))) / 2,
    width,
    height,
    scale,
  };
}

/** Bagian sel yang benar-benar tertutup foto (irisan sel dan kotak foto), relatif ke sel. */
export function visibleArea(cellW: number, cellH: number, p: Placement) {
  const left = Math.max(0, p.x);
  const top = Math.max(0, p.y);
  return {
    x: left,
    y: top,
    width: Math.max(0, Math.min(cellW, p.x + p.width) - left),
    height: Math.max(0, Math.min(cellH, p.y + p.height) - top),
  };
}

/** Geser foto sejauh dx, dy piksel sel: foto selalu bergerak searah seretan. */
export function panBy(
  framing: Framing,
  dx: number,
  dy: number,
  imgW: number,
  imgH: number,
  cellW: number,
  cellH: number,
  fit: Fit,
): Framing {
  const p = placeImage(imgW, imgH, cellW, cellH, framing, fit);
  const spareX = cellW - p.width;
  const spareY = cellH - p.height;
  const nextX = Math.abs(spareX) > 0.5 ? (2 * (p.x + dx)) / spareX - 1 : 0;
  const nextY = Math.abs(spareY) > 0.5 ? (2 * (p.y + dy)) / spareY - 1 : 0;
  return { ...framing, x: clamp(nextX, -1, 1), y: clamp(nextY, -1, 1) };
}

export function zoomTo(framing: Framing, zoom: number): Framing {
  return { ...framing, zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
