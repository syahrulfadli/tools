/** Menulis nomor halaman dan watermark (teks atau gambar) ke PDF dengan pdf-lib, di browser. */
import { StandardFonts, degrees, rgb } from "pdf-lib";
import { loadPdf, pageBoxes, readFile, toBlob } from "../../../lib/pdf-edit";
import { toUserSpace, visualSize } from "../../../lib/pdf-geometry";
import {
  centeredOrigin,
  formatPageNumber,
  hasWatermark,
  hexToRgb,
  imageWatermarkSize,
  lastPageNumber,
  numberOrigin,
  pageNumberFor,
  watermarkOrigin,
  type NumberOptions,
  type WatermarkOptions,
} from "./stamp";

export async function stampPdf(file: File, numbers: NumberOptions, watermark: WatermarkOptions, onProgress: (done: number, total: number) => void): Promise<Blob> {
  const doc = await loadPdf(await readFile(file));
  const pages = doc.getPages();
  const boxes = pageBoxes(doc);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const text = watermark.text.trim();
  const color = hexToRgb(watermark.color);
  const stamp = hasWatermark(watermark);
  // Gambar disematkan sekali dan dipakai ulang di setiap halaman.
  const image = stamp && watermark.kind === "image" && watermark.image ? await doc.embedPng(watermark.image.png) : null;
  const last = lastPageNumber(pages.length, numbers);

  for (const [i, page] of pages.entries()) {
    onProgress(i, pages.length);
    const box = boxes[i];
    const size = visualSize(box);

    if (image) {
      const fit = imageWatermarkSize(size, image, watermark.scale);
      const origin = centeredOrigin(size, fit.width, fit.height, watermark.angle);
      const at = toUserSpace(box, origin.x, origin.y);
      page.drawImage(image, {
        x: at.x,
        y: at.y,
        width: fit.width,
        height: fit.height,
        opacity: watermark.opacity,
        rotate: degrees(watermark.angle + at.angle),
      });
    } else if (stamp && text) {
      const origin = watermarkOrigin(size, bold.widthOfTextAtSize(text, watermark.size), watermark.size, watermark.angle);
      const at = toUserSpace(box, origin.x, origin.y);
      page.drawText(text, {
        x: at.x,
        y: at.y,
        size: watermark.size,
        font: bold,
        color: rgb(color.r, color.g, color.b),
        opacity: watermark.opacity,
        rotate: degrees(watermark.angle + at.angle),
      });
    }

    const n = numbers.enabled ? pageNumberFor(i + 1, numbers) : null;
    if (n !== null) {
      const label = formatPageNumber(numbers.format, n, last);
      const origin = numberOrigin(size, font.widthOfTextAtSize(label, numbers.size), numbers);
      const at = toUserSpace(box, origin.x, origin.y);
      page.drawText(label, { x: at.x, y: at.y, size: numbers.size, font, color: rgb(0.1, 0.1, 0.1), rotate: degrees(at.angle) });
    }
  }
  onProgress(pages.length, pages.length);
  return toBlob(await doc.save());
}
