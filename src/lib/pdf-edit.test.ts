import { PDFDocument, degrees } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { extractParts, loadPdf, mergePdfs, pageBoxes, rearrangePdf } from "./pdf-edit";

/** PDF uji: halaman ke-i berukuran lebar 100 + i, supaya urutan bisa diperiksa. */
async function makeFile(name: string, pages: number, widthBase = 100) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([widthBase + i, 200]);
  return new File([(await doc.save()) as Uint8Array<ArrayBuffer>], name, { type: "application/pdf" });
}

async function widths(blob: Blob) {
  const doc = await PDFDocument.load(new Uint8Array(await blob.arrayBuffer()));
  return doc.getPages().map((page) => page.getWidth());
}

describe("mergePdfs", () => {
  it("menggabung halaman sesuai urutan file", async () => {
    const a = await makeFile("a.pdf", 2, 100);
    const b = await makeFile("b.pdf", 3, 300);
    expect(await widths(await mergePdfs([b, a], () => {}))).toEqual([300, 301, 302, 100, 101]);
  });

  it("melaporkan progres sampai selesai", async () => {
    const calls: number[] = [];
    await mergePdfs([await makeFile("a.pdf", 1), await makeFile("b.pdf", 1)], (done) => calls.push(done));
    expect(calls).toEqual([0, 1, 2]);
  });

  it("menyebut nama file yang rusak", async () => {
    const bad = new File(["bukan pdf"], "rusak.pdf");
    await expect(mergePdfs([await makeFile("a.pdf", 1), bad], () => {})).rejects.toThrow(/^rusak\.pdf: /);
  });
});

describe("extractParts", () => {
  it("membuat satu PDF per kelompok halaman, urutan kelompok dipertahankan", async () => {
    const file = await makeFile("x.pdf", 6);
    const out = await extractParts(file, [[5, 6], [1], [2, 3]], () => {});
    expect(await Promise.all(out.map(widths))).toEqual([[104, 105], [100], [101, 102]]);
  });
});

describe("loadPdf", () => {
  it("menolak file yang bukan PDF dengan pesan jelas", async () => {
    await expect(loadPdf(new TextEncoder().encode("halo"))).rejects.toThrow("bukan PDF yang valid");
  });
});

describe("rearrangePdf", () => {
  it("menyusun ulang, membuang, dan memutar halaman", async () => {
    const file = await makeFile("x.pdf", 4);
    const out = await rearrangePdf(file, [
      { page: 3, rotate: 0 },
      { page: 1, rotate: 90 },
      { page: 4, rotate: 270 },
    ]);
    const doc = await PDFDocument.load(new Uint8Array(await out.arrayBuffer()));
    expect(doc.getPages().map((page) => page.getWidth())).toEqual([102, 100, 103]);
    expect(pageBoxes(doc).map((box) => box.rotation)).toEqual([0, 90, 270]);
  });

  it("menambah rotasi ke rotasi halaman asal", async () => {
    const src = await PDFDocument.create();
    src.addPage([100, 200]).setRotation(degrees(270));
    const file = new File([(await src.save()) as Uint8Array<ArrayBuffer>], "r.pdf");
    const doc = await PDFDocument.load(new Uint8Array(await (await rearrangePdf(file, [{ page: 1, rotate: 180 }])).arrayBuffer()));
    expect(pageBoxes(doc)[0].rotation).toBe(90);
  });
});
