/**
 * Kompres gambar di browser: ukuran piksel diperkecil bila perlu, lalu di-encode ulang ke
 * JPEG, WebP, atau PNG. Hasil yang justru lebih besar dari file asli tidak dipakai.
 */
import { canvasToBlob, releaseCanvas } from "../../../lib/canvas";
import { targetSize } from "../../png-to-jpg/lib/convert";

export type OutputFormat = "image/jpeg" | "image/webp" | "image/png";

export interface CompressOptions {
  format: OutputFormat;
  /** 0–1; diabaikan untuk PNG (lossless). */
  quality: number;
  /** Sisi terpanjang maksimum dalam piksel; 0 = ukuran asli. Tidak pernah memperbesar. */
  maxEdge: number;
}

export interface Compressed {
  blob: Blob;
  width: number;
  height: number;
  /** True bila hasil tidak lebih kecil, jadi file asli dipakai apa adanya. */
  kept: boolean;
}

const EXTENSIONS: Record<OutputFormat, string> = { "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png" };

/** WebP bisa di-encode dari kanvas? (Safari lama tidak bisa; toBlob diam-diam memberi PNG.) */
export function supportsWebpEncode() {
  try {
    return document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

/** Nama file hasil: "foto.png" → "foto-kompres.webp". File asli yang dipertahankan memakai ekstensi aslinya. */
export function outputName(name: string, format: OutputFormat, kept: boolean) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = kept && dot > 0 ? name.slice(dot + 1) : EXTENSIONS[format];
  return `${base}-kompres.${ext}`;
}

/** File asli dipakai bila hasil tidak lebih kecil, formatnya sama, dan ukuran pikselnya tidak berubah. */
export function shouldKeepOriginal(original: { size: number; type: string }, result: { size: number }, format: OutputFormat, resized: boolean) {
  return !resized && original.type === format && result.size >= original.size;
}

export async function compressImage(file: File, bitmap: ImageBitmap, options: CompressOptions): Promise<Compressed> {
  const { width, height } = targetSize(bitmap.width, bitmap.height, options.maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung canvas 2D.");
  // JPEG tidak punya transparansi: area transparan diisi putih.
  if (options.format === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  try {
    const blob = await canvasToBlob(canvas, options.format, options.format === "image/png" ? undefined : options.quality);
    const resized = width !== bitmap.width || height !== bitmap.height;
    if (shouldKeepOriginal(file, blob, options.format, resized)) return { blob: file, width: bitmap.width, height: bitmap.height, kept: true };
    return { blob, width, height, kept: false };
  } finally {
    releaseCanvas(canvas);
  }
}
