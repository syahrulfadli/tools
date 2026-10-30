import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { buildPdf, deflate } from "./pdf-writer";

// JPEG 1×1 yang valid.
const JPEG_1X1 = Uint8Array.from(
  atob(
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  ),
  (c) => c.charCodeAt(0),
);

async function open(blob: Blob) {
  return getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false, verbosity: 0 }).promise;
}

describe("buildPdf", () => {
  it("menghasilkan PDF yang dibaca pdf.js dengan ukuran halaman yang benar", async () => {
    const rgb = await deflate(new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]));
    const alpha = await deflate(new Uint8Array([255, 128, 64, 0]));
    const blob = buildPdf(
      [
        {
          width: 595.28,
          height: 841.89,
          image: { width: 1, height: 1, filter: "DCTDecode", colorSpace: "DeviceGray", data: JPEG_1X1 },
          matrix: [500, 0, 0, 500, 47.64, 170.94],
        },
        {
          width: 300,
          height: 200,
          image: { width: 2, height: 2, filter: "FlateDecode", colorSpace: "DeviceRGB", data: rgb, alpha },
          matrix: [0, -200, 300, 0, 0, 200],
        },
      ],
      { title: "Uji (kurung) é" },
    );

    const doc = await open(blob);
    expect(doc.numPages).toBe(2);
    const first = (await doc.getPage(1)).getViewport({ scale: 1 });
    expect([first.width, first.height]).toEqual([595.28, 841.89]);
    const second = (await doc.getPage(2)).getViewport({ scale: 1 });
    expect([second.width, second.height]).toEqual([300, 200]);
    const { info } = (await doc.getMetadata()) as unknown as { info: { Title: string; Producer: string } };
    expect(info.Title).toBe("Uji (kurung) ?");
    expect(info.Producer).toBe("Productivity Tools");

    // Setiap halaman benar-benar menggambar satu gambar.
    const ops = await (await doc.getPage(2)).getOperatorList();
    expect(ops.fnArray.length).toBeGreaterThan(0);
    await doc.destroy();
  });

  it("tabel xref menunjuk tepat ke setiap objek", async () => {
    const blob = buildPdf([
      { width: 100, height: 100, image: { width: 1, height: 1, filter: "DCTDecode", colorSpace: "DeviceGray", data: JPEG_1X1 }, matrix: [100, 0, 0, 100, 0, 0] },
    ]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const text = new TextDecoder("latin1").decode(bytes);
    const startxref = Number(/startxref\n(\d+)/.exec(text)![1]);
    expect(text.slice(startxref, startxref + 4)).toBe("xref");
    const entries = text.slice(startxref).split("\n").slice(3).filter((line) => / n $/.test(line));
    entries.forEach((line, i) => {
      const offset = Number(line.slice(0, 10));
      expect(text.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
    });
  });
});
