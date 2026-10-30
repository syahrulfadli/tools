/**
 * Konversi gambar (PNG, juga WebP/GIF/BMP) ke JPEG di browser.
 * JPEG tidak punya transparansi, jadi area transparan diisi warna latar pilihan.
 */
import { canvasLimitFactor, canvasToBlob, releaseCanvas } from "../../../lib/canvas";

export interface ConvertOptions {
  /** 0–1. */
  quality: number;
  /** Warna CSS untuk area transparan. */
  background: string;
  /** Sisi terpanjang maksimum dalam piksel; 0 = ukuran asli. Tidak pernah memperbesar. */
  maxEdge: number;
}

export interface Decoded {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  hasAlpha: boolean;
}

export const ACCEPTED_TYPES = ["image/png", "image/webp", "image/gif", "image/bmp", "image/avif"];

export function isConvertible(file: File) {
  return ACCEPTED_TYPES.includes(file.type) || /\.(png|webp|gif|bmp|avif)$/i.test(file.name);
}

/** Ukuran hasil: diperkecil ke `maxEdge` bila perlu, lalu dibatasi agar kanvas aman. */
export function targetSize(width: number, height: number, maxEdge: number) {
  const byEdge = maxEdge > 0 ? Math.min(1, maxEdge / Math.max(width, height)) : 1;
  const factor = Math.min(byEdge, canvasLimitFactor(width, height));
  return { width: Math.max(1, Math.round(width * factor)), height: Math.max(1, Math.round(height * factor)) };
}

export async function decode(file: File): Promise<Decoded> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("tidak bisa dibaca sebagai gambar.");
  }
  return { bitmap, width: bitmap.width, height: bitmap.height, hasAlpha: detectAlpha(bitmap) };
}

/** Cek transparansi pada salinan kecil (maks. 256 px) agar cepat untuk gambar besar. */
function detectAlpha(bitmap: ImageBitmap) {
  const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  releaseCanvas(canvas);
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

export async function toJpeg(bitmap: ImageBitmap, options: ConvertOptions) {
  const { width, height } = targetSize(bitmap.width, bitmap.height, options.maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung canvas 2D.");
  ctx.fillStyle = options.background;
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  try {
    const blob = await canvasToBlob(canvas, "image/jpeg", options.quality);
    return { blob, width, height };
  } finally {
    releaseCanvas(canvas);
  }
}

/** Selisih ukuran dalam persen, dibulatkan: 2.400 → 380 KB = −84. */
export function sizeChange(before: number, after: number) {
  return before > 0 ? Math.round(((after - before) / before) * 100) : 0;
}
