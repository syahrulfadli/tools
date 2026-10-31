import { PDFDocument, degrees } from "pdf-lib";
import { OPS, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { stampPdf } from "./apply";
import {
  CAP_HEIGHT,
  PT_PER_MM,
  centeredOrigin,
  formatPageNumber,
  hasWatermark,
  hexToRgb,
  imageWatermarkSize,
  lastPageNumber,
  numberOrigin,
  pageNumberFor,
  unsupportedChars,
  watermarkOrigin,
  type NumberOptions,
  type WatermarkOptions,
} from "./stamp";

const numbers: NumberOptions = { enabled: true, format: "n", vertical: "bottom", horizontal: "center", size: 10, marginMm: 10, startPage: 1, firstNumber: 1 };
const noWatermark: WatermarkOptions = { enabled: false, kind: "text", text: "", size: 60, image: null, scale: 0.5, opacity: 0.2, angle: 45, color: "#808080" };
/** PNG 1×1 transparan. */
const PNG_1X1 = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

describe("nomor halaman", () => {
  it("menulis format yang dipilih", () => {
    expect(formatPageNumber("n", 3, 10)).toBe("3");
    expect(formatPageNumber("n-of", 3, 10)).toBe("3 / 10");
    expect(formatPageNumber("page-n", 3, 10)).toBe("Halaman 3");
    expect(formatPageNumber("page-n-of", 3, 10)).toBe("Halaman 3 dari 10");
  });

  it("melewati halaman sebelum halaman mulai", () => {
    const options = { startPage: 3, firstNumber: 1 };
    expect(pageNumberFor(2, options)).toBeNull();
    expect(pageNumberFor(3, options)).toBe(1);
    expect(pageNumberFor(5, options)).toBe(3);
    expect(lastPageNumber(10, options)).toBe(8);
  });

  it("menaruh teks sesuai posisi dan jarak tepi", () => {
    const page = { width: 600, height: 800 };
    const m = 10 * PT_PER_MM;
    expect(numberOrigin(page, 20, numbers)).toEqual({ x: 290, y: m });
    expect(numberOrigin(page, 20, { ...numbers, horizontal: "right", vertical: "top" })).toEqual({ x: 600 - m - 20, y: 800 - m - 10 * CAP_HEIGHT });
    expect(numberOrigin(page, 20, { ...numbers, horizontal: "left" }).x).toBe(m);
  });
});

describe("watermark", () => {
  it("tanpa sudut, tengah teks tepat di tengah halaman", () => {
    const o = watermarkOrigin({ width: 600, height: 800 }, 200, 50, 0);
    expect(o.x).toBeCloseTo(200);
    expect(o.y).toBeCloseTo(400 - (50 * CAP_HEIGHT) / 2);
  });

  it("dengan sudut 45°, titik awal bergeser ke kiri bawah", () => {
    const o = watermarkOrigin({ width: 600, height: 800 }, 200, 50, 45);
    expect(o.x).toBeLessThan(300);
    expect(o.y).toBeLessThan(400);
  });

  it("kotak yang diputar tetap berpusat di tengah halaman", () => {
    const page = { width: 600, height: 800 };
    for (const angle of [0, 30, 45, 90]) {
      const o = centeredOrigin(page, 200, 100, angle);
      const rad = (angle * Math.PI) / 180;
      // Tengah kotak = titik awal + (lebar/2, tinggi/2) yang diputar.
      expect(o.x + 100 * Math.cos(rad) - 50 * Math.sin(rad)).toBeCloseTo(300);
      expect(o.y + 100 * Math.sin(rad) + 50 * Math.cos(rad)).toBeCloseTo(400);
    }
  });

  it("gambar dimuat di kotak pecahan halaman dengan rasio tetap", () => {
    const page = { width: 600, height: 800 };
    expect(imageWatermarkSize(page, { width: 400, height: 200 }, 0.5)).toEqual({ width: 300, height: 150 });
    // Gambar tinggi dibatasi tinggi kotak (400), bukan lebarnya.
    expect(imageWatermarkSize(page, { width: 100, height: 400 }, 0.5)).toEqual({ width: 100, height: 400 });
  });

  it("hanya dianggap ada bila isinya ada", () => {
    expect(hasWatermark({ ...noWatermark, enabled: true, text: "  " })).toBe(false);
    expect(hasWatermark({ ...noWatermark, enabled: true, text: "DRAF" })).toBe(true);
    expect(hasWatermark({ ...noWatermark, enabled: true, kind: "image" })).toBe(false);
    expect(hasWatermark({ ...noWatermark, enabled: true, kind: "image", image: { png: PNG_1X1, width: 1, height: 1 } })).toBe(true);
    expect(hasWatermark({ ...noWatermark, kind: "image", image: { png: PNG_1X1, width: 1, height: 1 } })).toBe(false);
  });
});

describe("unsupportedChars", () => {
  it("menerima huruf Latin dan tanda baca umum", () => {
    expect(unsupportedChars("RAHASIA – “Draf” © 2026 é")).toEqual([]);
  });

  it("menolak huruf di luar WinAnsi tanpa duplikat", () => {
    expect(unsupportedChars("日本日 ✓")).toEqual(["日", "本", "✓"]);
  });
});

describe("hexToRgb", () => {
  it("mengurai warna", () => {
    expect(hexToRgb("#ff0080")).toEqual({ r: 1, g: 0, b: 128 / 255 });
    expect(hexToRgb("salah")).toEqual({ r: 0, g: 0, b: 0 });
  });
});

/** Baca teks dan posisinya per halaman dengan pdf.js (pembaca independen dari pdf-lib). */
async function readText(blob: Blob) {
  const pdf = await getDocument({ data: new Uint8Array(await blob.arrayBuffer()), standardFontDataUrl: "node_modules/pdfjs-dist/standard_fonts/" }).promise;
  const out: { str: string; x: number; y: number }[][] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    out.push(
      content.items
        .filter((item) => "str" in item && item.str.trim())
        .map((item) => {
          const { str, transform } = item as { str: string; transform: number[] };
          // Koordinat tampilan (setelah rotasi halaman), y dari atas.
          const [x, y] = viewport.convertToViewportPoint(transform[4], transform[5]);
          return { str, x, y };
        }),
    );
  }
  await pdf.destroy();
  return out;
}

describe("stampPdf", () => {
  async function makePdf(rotations: number[]) {
    const doc = await PDFDocument.create();
    for (const r of rotations) doc.addPage([600, 800]).setRotation(degrees(r));
    return new File([(await doc.save()) as Uint8Array<ArrayBuffer>], "x.pdf");
  }

  it("menulis nomor di bawah tengah, juga pada halaman yang diputar", async () => {
    const file = await makePdf([0, 90, 180, 270]);
    const pages = await readText(await stampPdf(file, { ...numbers, format: "n-of" }, noWatermark, () => {}));
    pages.forEach((items, i) => {
      expect(items.map((item) => item.str)).toEqual([`${i + 1} / 4`]);
      const [item] = items;
      const visualWidth = i % 2 ? 800 : 600;
      const visualHeight = i % 2 ? 600 : 800;
      // Dekat tepi bawah (y tampilan dari atas) dan sekitar tengah horizontal.
      expect(item.y).toBeGreaterThan(visualHeight - 40);
      expect(Math.abs(item.x - visualWidth / 2)).toBeLessThan(20);
    });
  });

  it("melewati halaman sampul dan menulis watermark", async () => {
    const file = await makePdf([0, 0, 0]);
    const pages = await readText(await stampPdf(file, { ...numbers, startPage: 2, format: "page-n-of" }, { ...noWatermark, enabled: true, text: "RAHASIA" }, () => {}));
    expect(pages.map((items) => items.map((item) => item.str).sort())).toEqual([["RAHASIA"], ["Halaman 1 dari 2", "RAHASIA"], ["Halaman 2 dari 2", "RAHASIA"]]);
  });

  it("menulis watermark gambar di setiap halaman tanpa teks watermark", async () => {
    const file = await makePdf([0, 90]);
    const watermark: WatermarkOptions = { ...noWatermark, enabled: true, kind: "image", text: "RAHASIA", image: { png: PNG_1X1, width: 1, height: 1 } };
    const blob = await stampPdf(file, { ...numbers, enabled: false }, watermark, () => {});
    expect((await readText(blob)).flat()).toEqual([]);
    const pdf = await getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
    for (let p = 1; p <= pdf.numPages; p++) {
      const ops = await (await pdf.getPage(p)).getOperatorList();
      expect(ops.fnArray.filter((fn) => fn === OPS.paintImageXObject)).toHaveLength(1);
    }
    await pdf.destroy();
  });
});
