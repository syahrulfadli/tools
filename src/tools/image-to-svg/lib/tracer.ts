/** Sisi browser: ambil piksel gambar pada ukuran lacak dan jalankan pelacakan di Web Worker. */
import { releaseCanvas } from "../../../lib/canvas";
import type { Raster, TraceResult } from "./trace";
import type { TraceMessage, TraceRequest } from "./trace.worker";

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp", "image/avif"];

export function isTraceable(file: File) {
  return ACCEPTED_TYPES.includes(file.type) || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name);
}

/** Piksel RGBA bitmap, diperkecil ke `width` × `height`. */
export function rasterize(bitmap: ImageBitmap, width: number, height: number): Raster {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Browser tidak mendukung canvas 2D.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  releaseCanvas(canvas);
  return { width, height, data };
}

/**
 * Satu pekerjaan lacak di worker baru. `cancel()` mematikan worker seketika (pelacakan sinkron
 * tidak bisa disela dari dalam), dan promise-nya tidak pernah selesai setelah dibatalkan.
 */
export function startTrace(request: TraceRequest, onProgress: (done: number, total: number) => void) {
  const worker = new Worker(new URL("./trace.worker.ts", import.meta.url), { type: "module" });
  const promise = new Promise<TraceResult>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<TraceMessage>) => {
      const message = event.data;
      if (message.type === "progress") return onProgress(message.done, message.total);
      worker.terminate();
      if (message.type === "done") resolve(message.result);
      else reject(new Error(message.message));
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error("Pelacak gagal dimuat. Muat ulang halaman lalu coba lagi."));
    };
  });
  worker.postMessage(request, [request.raster.data.buffer]);
  return { promise, cancel: () => worker.terminate() };
}

export function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("File tidak bisa dibaca."));
    reader.readAsDataURL(file);
  });
}
