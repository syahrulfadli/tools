/** Ambil teks satu halaman lewat pdf.js. Hanya tipe yang diimpor, jadi bisa diuji dengan build pdf.js mana pun. */
import type { PDFDocumentProxy } from "pdfjs-dist";
import { itemsToLines, type TextItem } from "./text";

export async function extractPageLines(pdf: PDFDocumentProxy, pageNumber: number): Promise<string[]> {
  const page = await pdf.getPage(pageNumber);
  try {
    const content = await page.getTextContent();
    const items: TextItem[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const [, , c, d, x, y] = item.transform as number[];
      items.push({ str: item.str, x, y, width: item.width, height: item.height || Math.hypot(c, d), hasEOL: item.hasEOL });
    }
    return itemsToLines(items);
  } finally {
    page.cleanup();
  }
}
