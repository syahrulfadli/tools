import { fileStamp } from "../../../lib/files";
import { placeImage, visibleArea, type Framing } from "./crop";
import { borderSize, cellRects, cornerRadius, outputSize, snapRect, unitSize, type CollageSettings } from "./layout";

export interface RenderCell {
  image: CanvasImageSource & { naturalWidth: number; naturalHeight: number };
  framing: Framing;
}

/**
 * Gambar kolase ke kanvas baru dan kembalikan sebagai Blob. Semuanya terjadi di browser:
 * tidak ada file yang dikirim ke server. `type` bisa memaksa PNG (clipboard hanya menerima PNG);
 * latar tetap mengikuti `settings.format`, jadi salinan terlihat sama dengan unduhannya.
 */
export async function renderCollage(
  settings: CollageSettings,
  cells: (RenderCell | null)[],
  type: "image/png" | "image/jpeg" = settings.format === "jpeg" ? "image/jpeg" : "image/png",
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
    const place = placeImage(imgW, imgH, rect.width, rect.height, cell.framing, cell.framing.fit ?? settings.fit);
    // Sudut membulat mengikuti bagian yang tertutup foto, jadi foto "utuh" yang lebih kecil
    // dari selnya tetap bersudut bulat.
    const area = visibleArea(rect.width, rect.height, place);
    const clip = { x: rect.x + area.x, y: rect.y + area.y, width: area.width, height: area.height };

    const border = borderSize(settings.borderWidth, clip, unit);

    ctx.save();
    roundedRectPath(ctx, clip.x, clip.y, clip.width, clip.height, cornerRadius(settings.radius, clip, unit));
    ctx.clip();
    ctx.drawImage(cell.image, rect.x + place.x, rect.y + place.y, place.width, place.height);
    if (border > 0) {
      // Garis 2× tebal di jalur klip: separuh luarnya terpotong, sisanya bingkai di sisi dalam,
      // sama dengan `border` CSS di pratinjau (sudut dalam = radius − tebal).
      ctx.lineWidth = border * 2;
      ctx.strokeStyle = settings.borderColor;
      ctx.stroke();
    }
    ctx.restore();
  });

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
