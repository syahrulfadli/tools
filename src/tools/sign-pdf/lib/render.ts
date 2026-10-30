/** Buat PNG transparan tanda tangan dari goresan atau gambar unggahan, dengan Canvas API. */
import { canvasLimitFactor, canvasToBlob, releaseCanvas } from "../../../lib/canvas";
import { alphaBounds, strokeBounds, whiteToTransparent, type Stroke } from "./signature";

export interface Signature {
  bytes: Uint8Array;
  /** Object URL PNG untuk pratinjau; lepas saat diganti. */
  url: string;
  width: number;
  height: number;
}

/** Gambar goresan dengan kurva halus (titik tengah antar titik sebagai ujung kurva). */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: readonly Stroke[], color: string, lineWidth: number) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of strokes) {
    if (stroke.length === 1) {
      ctx.beginPath();
      ctx.arc(stroke[0][0], stroke[0][1], lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(stroke[0][0], stroke[0][1]);
    for (let i = 1; i < stroke.length - 1; i++) {
      const [x, y] = stroke[i];
      const [nx, ny] = stroke[i + 1];
      ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
    }
    const end = stroke[stroke.length - 1];
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
  }
}

async function finish(canvas: HTMLCanvasElement): Promise<Signature> {
  try {
    const blob = await canvasToBlob(canvas, "image/png");
    return { bytes: new Uint8Array(await blob.arrayBuffer()), url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height };
  } finally {
    releaseCanvas(canvas);
  }
}

/** Goresan (koordinat px CSS) → PNG terpotong rapat, digambar `scale`× agar tajam saat dicetak. */
export async function strokesToSignature(strokes: readonly Stroke[], color: string, lineWidth: number, scale = 4): Promise<Signature | null> {
  const bounds = strokeBounds(strokes, lineWidth);
  if (!bounds) return null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(bounds.width * scale);
  canvas.height = Math.ceil(bounds.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung canvas 2D.");
  ctx.scale(scale, scale);
  ctx.translate(-bounds.x, -bounds.y);
  drawStrokes(ctx, strokes, color, lineWidth);
  return finish(canvas);
}

/** Foto/scan tanda tangan → PNG, opsional dengan latar terang dibuang, lalu dipotong ke area bertinta. */
export async function imageToSignature(file: File, removeWhite: boolean): Promise<Signature> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Gambar tidak bisa dibaca. Pakai PNG atau JPEG.");
  }
  // Tanda tangan tidak perlu lebih dari ±2000 px; batasi agar ringan dan aman untuk kanvas.
  const factor = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height), canvasLimitFactor(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * factor));
  const height = Math.max(1, Math.round(bitmap.height * factor));
  const full = document.createElement("canvas");
  full.width = width;
  full.height = height;
  const ctx = full.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Browser tidak mendukung canvas 2D.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const image = ctx.getImageData(0, 0, width, height);
  if (removeWhite) {
    whiteToTransparent(image.data);
    ctx.putImageData(image, 0, 0);
  }
  const bounds = alphaBounds(image.data, width, height);
  if (!bounds) {
    releaseCanvas(full);
    throw new Error("Gambar terlihat kosong setelah latar putih dibuang.");
  }
  const out = document.createElement("canvas");
  out.width = bounds.width;
  out.height = bounds.height;
  out.getContext("2d")?.drawImage(full, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
  releaseCanvas(full);
  return finish(out);
}
