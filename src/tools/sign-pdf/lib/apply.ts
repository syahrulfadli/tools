/** Menempel gambar tanda tangan (PNG transparan) ke halaman PDF dengan pdf-lib, di browser. */
import { degrees } from "pdf-lib";
import { loadPdf, pageBoxes, readFile, toBlob } from "../../../lib/pdf-edit";
import { toUserSpace, visualSize } from "../../../lib/pdf-geometry";
import { toPdfRect, type Placement } from "./placement";

/** `ratio` = tinggi/lebar gambar tanda tangan. Gambar disematkan sekali dan dipakai ulang. */
export async function signPdf(file: File, png: Uint8Array, ratio: number, placements: readonly Placement[]): Promise<Blob> {
  const doc = await loadPdf(await readFile(file));
  const pages = doc.getPages();
  const boxes = pageBoxes(doc);
  const image = await doc.embedPng(png);
  for (const placement of placements) {
    const page = pages[placement.page - 1];
    if (!page) continue;
    const box = boxes[placement.page - 1];
    const rect = toPdfRect(placement, ratio, visualSize(box));
    const at = toUserSpace(box, rect.x, rect.y);
    page.drawImage(image, { x: at.x, y: at.y, width: rect.width, height: rect.height, rotate: degrees(at.angle) });
  }
  return toBlob(await doc.save());
}
