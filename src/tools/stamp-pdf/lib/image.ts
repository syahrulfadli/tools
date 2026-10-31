/**
 * Menyiapkan gambar watermark: file apa pun yang bisa ditampilkan browser (PNG, JPEG, WebP, GIF, SVG)
 * digambar ke kanvas lalu disimpan sebagai PNG, karena pdf-lib hanya menyematkan PNG dan JPEG.
 * Lewat <img>, orientasi EXIF ikut diterapkan dan transparansi tetap terjaga.
 */
import { canvasToBlob, releaseCanvas } from "../../../lib/canvas";
import type { WatermarkImage } from "./stamp";

export const WATERMARK_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";

/** Sisi terpanjang PNG hasil. Cukup tajam untuk watermark selebar halaman, tanpa membengkakkan PDF. */
const MAX_SIDE = 2000;
/** Ukuran bawaan SVG tanpa lebar/tinggi intrinsik. */
const FALLBACK_SIDE = 1000;

export function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
}

export async function loadWatermarkImage(file: File): Promise<WatermarkImage & { url: string }> {
  const source = URL.createObjectURL(file);
  const canvas = document.createElement("canvas");
  try {
    const img = new Image();
    img.src = source;
    try {
      await img.decode();
    } catch {
      throw new Error(`${file.name} tidak bisa dibaca sebagai gambar.`);
    }
    const width = img.naturalWidth || FALLBACK_SIDE;
    const height = img.naturalHeight || FALLBACK_SIDE;
    const factor = Math.min(1, MAX_SIDE / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * factor));
    canvas.height = Math.max(1, Math.round(height * factor));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, "image/png");
    return { png: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height, url: URL.createObjectURL(blob) };
  } finally {
    URL.revokeObjectURL(source);
    releaseCanvas(canvas);
  }
}
