/** Olah gambar tanda tangan: batas goresan, buang latar putih, potong ke area bertinta. Fungsi murni. */

export type Point = [number, number];
export type Stroke = Point[];

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Kotak yang memuat semua goresan, ditambah setengah tebal garis di tiap sisi. Null bila kosong. */
export function strokeBounds(strokes: readonly Stroke[], lineWidth: number): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const stroke of strokes)
    for (const [x, y] of stroke) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  if (minX === Infinity) return null;
  const pad = lineWidth / 2 + 1;
  return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
}

/**
 * Jadikan piksel terang transparan (foto/scan tanda tangan di kertas putih). Piksel di antara
 * `threshold` dan putih dibuat setengah transparan agar tepi goresan tetap halus. Mengubah `data`.
 */
export function whiteToTransparent(data: Uint8ClampedArray, threshold = 200) {
  for (let i = 0; i < data.length; i += 4) {
    const light = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (light >= threshold) {
      const keep = 1 - (light - threshold) / (255 - threshold || 1);
      data[i + 3] = Math.round(data[i + 3] * Math.max(0, keep));
    }
  }
  return data;
}

/** Kotak piksel yang alfanya di atas `minAlpha`. Null bila gambar kosong. */
export function alphaBounds(data: Uint8ClampedArray, width: number, height: number, minAlpha = 8): Bounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > minAlpha) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
