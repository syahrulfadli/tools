/** Pengodean ulang gambar JPEG di dalam PDF memakai kanvas browser. */
import { canvasLimitFactor, canvasToBlob, releaseCanvas } from "../../../lib/canvas";
import type { ImageEncoder } from "./recompress";

/** Ukuran hasil: diperkecil ke `maxEdge`, tidak pernah diperbesar, dan dijaga di bawah batas kanvas. */
export function reducedSize(width: number, height: number, maxEdge: number) {
  const factor = Math.min(1, maxEdge / Math.max(width, height), canvasLimitFactor(width, height));
  return { width: Math.max(1, Math.round(width * factor)), height: Math.max(1, Math.round(height * factor)) };
}

export function canvasEncoder(maxEdge: number, quality: number): ImageEncoder {
  return async (jpeg) => {
    let bitmap: ImageBitmap;
    try {
      // "none": penampil PDF mengabaikan orientasi EXIF, jadi piksel jangan diputar.
      bitmap = await createImageBitmap(new Blob([jpeg as Uint8Array<ArrayBuffer>], { type: "image/jpeg" }), { imageOrientation: "none" });
    } catch {
      return null;
    }
    const { width, height } = reducedSize(bitmap.width, bitmap.height, maxEdge);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    try {
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      return { data: new Uint8Array(await blob.arrayBuffer()), width, height };
    } finally {
      releaseCanvas(canvas);
    }
  };
}
