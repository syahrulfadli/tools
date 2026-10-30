/**
 * Menyiapkan gambar dari perangkat user untuk PDF, sepenuhnya di browser.
 *
 * Mode "Asli": JPEG dimasukkan apa adanya (lossless, cepat, kecil); gambar lain sebagai
 * piksel lossless (Flate) dengan transparansi. Mode "Seimbang"/"Kecil": semua gambar
 * diperkecil dan di-encode ulang ke JPEG.
 */
import { canvasLimitFactor, canvasToBlob, releaseCanvas } from "../../../lib/canvas";
import { parseJpeg, type JpegInfo } from "./jpeg";
import { imageMatrix, pageLayout, rotatedSize, type PageSettings, type Rotation } from "./layout";
import { buildPdf, deflate, type PdfImage, type PdfPage } from "./pdf-writer";

export type Quality = "original" | "balanced" | "small";

export const QUALITY_PRESETS: Record<Exclude<Quality, "original">, { maxEdge: number; quality: number }> = {
  /** ±300 dpi untuk A4. */
  balanced: { maxEdge: 2480, quality: 0.85 },
  small: { maxEdge: 1600, quality: 0.7 },
};

export interface SourceImage {
  id: string;
  file: File;
  name: string;
  /** Ukuran tampil (orientasi EXIF sudah diterapkan), sebelum rotasi pengguna. */
  width: number;
  height: number;
  /** Ada bila file JPEG yang bisa dimasukkan apa adanya (abu-abu/RGB). */
  jpeg?: JpegInfo;
  thumbUrl: string;
  rotation: Rotation;
}

export const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif";

export function isImage(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(file.name);
}

async function readJpegInfo(file: File) {
  if (!(file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name))) return undefined;
  // Header biasanya di awal; profil warna/thumbnail besar bisa mendorongnya lebih jauh.
  const info = parseJpeg(new Uint8Array(await file.slice(0, 512 * 1024).arrayBuffer())) ?? parseJpeg(new Uint8Array(await file.arrayBuffer()));
  return info && (info.components === 1 || info.components === 3) ? info : undefined;
}

export async function loadSource(file: File): Promise<SourceImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(/\.(heic|heif)$/i.test(file.name) ? "HEIC belum didukung browser ini. Ubah ke JPG dulu." : "tidak bisa dibaca sebagai gambar.");
  }
  try {
    const scale = Math.min(1, 360 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    // PNG agar transparansi terlihat di pratinjau.
    const thumb = await canvasToBlob(canvas, "image/png");
    releaseCanvas(canvas);
    return {
      id: crypto.randomUUID(),
      file,
      name: file.name,
      width: bitmap.width,
      height: bitmap.height,
      jpeg: await readJpegInfo(file),
      thumbUrl: URL.createObjectURL(thumb),
      rotation: 0,
    };
  } finally {
    bitmap.close();
  }
}

export function releaseSource(source: SourceImage) {
  URL.revokeObjectURL(source.thumbUrl);
}

/** Gambar siap PDF + orientasi EXIF yang masih harus diterapkan lewat matriks. */
async function toPdfImage(source: SourceImage, quality: Quality): Promise<{ image: PdfImage; orientation: number }> {
  if (quality === "original" && source.jpeg) {
    return {
      image: {
        width: source.jpeg.width,
        height: source.jpeg.height,
        filter: "DCTDecode",
        colorSpace: source.jpeg.components === 1 ? "DeviceGray" : "DeviceRGB",
        data: new Uint8Array(await source.file.arrayBuffer()),
      },
      orientation: source.jpeg.orientation,
    };
  }

  // createImageBitmap menerapkan orientasi EXIF, jadi hasilnya sudah tegak.
  const bitmap = await createImageBitmap(source.file);
  const preset = quality === "original" ? null : QUALITY_PRESETS[quality];
  const byEdge = preset ? Math.min(1, preset.maxEdge / Math.max(bitmap.width, bitmap.height)) : 1;
  const scale = Math.min(byEdge, canvasLimitFactor(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: !preset })!;
  try {
    if (preset) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas, "image/jpeg", preset.quality);
      return {
        image: { width: canvas.width, height: canvas.height, filter: "DCTDecode", colorSpace: "DeviceRGB", data: new Uint8Array(await blob.arrayBuffer()) },
        orientation: 1,
      };
    }

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = canvas.width * canvas.height;
    const rgb = new Uint8Array(pixels * 3);
    const alpha = new Uint8Array(pixels);
    let transparent = false;
    for (let i = 0; i < pixels; i++) {
      rgb[i * 3] = data[i * 4];
      rgb[i * 3 + 1] = data[i * 4 + 1];
      rgb[i * 3 + 2] = data[i * 4 + 2];
      alpha[i] = data[i * 4 + 3];
      if (alpha[i] < 255) transparent = true;
    }
    return {
      image: {
        width: canvas.width,
        height: canvas.height,
        filter: "FlateDecode",
        colorSpace: "DeviceRGB",
        data: await deflate(rgb),
        alpha: transparent ? await deflate(alpha) : undefined,
      },
      orientation: 1,
    };
  } finally {
    bitmap.close();
    releaseCanvas(canvas);
  }
}

/** Tata letak satu halaman untuk gambar ini (dipakai pratinjau dan PDF). */
export function layoutFor(source: SourceImage, settings: PageSettings) {
  const shown = rotatedSize(source.width, source.height, source.rotation);
  return pageLayout(shown.width, shown.height, settings);
}

export async function createPdf(
  sources: SourceImage[],
  settings: PageSettings & { quality: Quality },
  title: string,
  onProgress: (done: number) => void,
): Promise<Blob> {
  const pages: PdfPage[] = [];
  for (const [i, source] of sources.entries()) {
    const { image, orientation } = await toPdfImage(source, settings.quality);
    const layout = layoutFor(source, settings);
    pages.push({ width: layout.width, height: layout.height, image, matrix: imageMatrix(layout.box, layout.height, orientation, source.rotation) });
    onProgress(i + 1);
  }
  return buildPdf(pages, { title });
}
