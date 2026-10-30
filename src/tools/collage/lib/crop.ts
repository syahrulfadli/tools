/**
 * Pembingkaian foto di dalam sel ("cover" + zoom + geser).
 *
 * Posisi disimpan ternormalisasi (x, y di rentang -1..1, 0 = tengah) sehingga tidak
 * bergantung pada resolusi: pergeseran di pratinjau kecil menghasilkan potongan yang
 * sama di ekspor 4096 px.
 */

export interface Framing {
  /** 1 = pas menutupi sel; 4 = diperbesar 4×. */
  zoom: number;
  x: number;
  y: number;
}

export const DEFAULT_FRAMING: Framing = { zoom: 1, x: 0, y: 0 };
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export interface Crop {
  /** Potongan sumber dalam piksel gambar asli. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Faktor skala dari piksel gambar ke piksel sel. */
  scale: number;
}

export function coverCrop(
  imgW: number,
  imgH: number,
  cellW: number,
  cellH: number,
  { zoom, x, y }: Framing,
): Crop {
  const scale = Math.max(cellW / imgW, cellH / imgH) * clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const sw = Math.min(imgW, cellW / scale);
  const sh = Math.min(imgH, cellH / scale);
  const sx = ((imgW - sw) * (1 + clamp(x, -1, 1))) / 2;
  const sy = ((imgH - sh) * (1 + clamp(y, -1, 1))) / 2;
  return { sx, sy, sw, sh, scale };
}

/** Geser foto sejauh dx, dy piksel sel (arah seret: ke kanan = melihat bagian kiri foto). */
export function panBy(
  framing: Framing,
  dx: number,
  dy: number,
  imgW: number,
  imgH: number,
  cellW: number,
  cellH: number,
): Framing {
  const crop = coverCrop(imgW, imgH, cellW, cellH, framing);
  const spareX = imgW - crop.sw;
  const spareY = imgH - crop.sh;
  const nextX = spareX > 0.5 ? ((crop.sx - dx / crop.scale) * 2) / spareX - 1 : 0;
  const nextY = spareY > 0.5 ? ((crop.sy - dy / crop.scale) * 2) / spareY - 1 : 0;
  return { ...framing, x: clamp(nextX, -1, 1), y: clamp(nextY, -1, 1) };
}

export function zoomTo(framing: Framing, zoom: number): Framing {
  return { ...framing, zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
