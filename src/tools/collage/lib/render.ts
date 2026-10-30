import { fileStamp } from "../../../lib/files";
import { coverCrop, type Framing } from "./crop";
import { cellRects, cornerRadius, outputSize, snapRect, unitSize, type CollageSettings } from "./layout";

export interface RenderCell {
  image: CanvasImageSource & { naturalWidth: number; naturalHeight: number };
  framing: Framing;
}

/**
 * Gambar kolase ke kanvas baru dan kembalikan sebagai Blob. Semuanya terjadi di browser:
 * tidak ada file yang dikirim ke server.
 */
export async function renderCollage(
  settings: CollageSettings,
  cells: (RenderCell | null)[],
): Promise<{ blob: Blob; width: number; height: number }> {
  const { width, height } = outputSize(settings.ratioW, settings.ratioH, settings.longEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung canvas 2D.");

  const transparent = settings.background === "transparent";
  if (!transparent || settings.format === "jpeg") {
    ctx.fillStyle = transparent ? "#ffffff" : settings.background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const unit = unitSize(width, height);
  cellRects(width, height, settings).forEach((rawRect, index) => {
    const cell = cells[index];
    if (!cell) return;
    const rect = snapRect(rawRect);
    const { naturalWidth: imgW, naturalHeight: imgH } = cell.image;
    const crop = coverCrop(imgW, imgH, rect.width, rect.height, cell.framing);

    ctx.save();
    roundedRectPath(ctx, rect.x, rect.y, rect.width, rect.height, cornerRadius(settings.radius, rect, unit));
    ctx.clip();
    ctx.drawImage(cell.image, crop.sx, crop.sy, crop.sw, crop.sh, rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  });

  const type = settings.format === "jpeg" ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
  // Lepas memori kanvas besar secepatnya (penting di perangkat mobile).
  canvas.width = canvas.height = 0;
  if (!blob) throw new Error("Gagal membuat file gambar. Coba ukuran yang lebih kecil.");
  return { blob, width, height };
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (r <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function collageFilename(settings: CollageSettings, now = new Date()) {
  const ext = settings.format === "jpeg" ? "jpg" : "png";
  return `kolase-${settings.rows}x${settings.cols}-${settings.ratioW}x${settings.ratioH}-${fileStamp(now)}.${ext}`;
}
