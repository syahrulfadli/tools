import { PDFDocument, StandardFonts } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { describe, expect, it } from "vitest";
import { extractPageLines } from "./extract";
import { formatDocument, itemsToLines, textStats, unwrapLines, type TextItem } from "./text";

const item = (str: string, x: number, y: number, width: number, hasEOL = false): TextItem => ({ str, x, y, width, height: 10, hasEOL });

describe("itemsToLines", () => {
  it("menyambung potongan di baris yang sama dan memberi spasi bila ada jarak", () => {
    expect(itemsToLines([item("Halo", 0, 700, 20), item("dunia", 24, 700, 25), item("!", 49, 700, 3)])).toEqual(["Halo dunia!"]);
  });

  it("memecah baris saat posisi vertikal berubah dan menandai paragraf", () => {
    const lines = itemsToLines([item("Baris satu", 0, 700, 50), item("Baris dua", 0, 688, 45), item("Paragraf baru", 0, 650, 60)]);
    expect(lines).toEqual(["Baris satu", "Baris dua", "", "Paragraf baru"]);
  });

  it("menghormati penanda akhir baris pdf.js tanpa baris kosong ganda", () => {
    const lines = itemsToLines([item("A", 0, 700, 5, true), { ...item("", 0, 700, 0), hasEOL: true }, item("B", 0, 688, 5)]);
    expect(lines).toEqual(["A", "B"]);
  });

  it("halaman tanpa teks menghasilkan daftar kosong", () => {
    expect(itemsToLines([])).toEqual([]);
  });
});

describe("unwrapLines", () => {
  it("menggabung baris paragraf dan menyambung kata berpenggal", () => {
    expect(unwrapLines(["Ini kali-", "mat panjang yang", "terpotong.", "", "Kedua."])).toBe("Ini kalimat panjang yang terpotong.\n\nKedua.");
  });
});

describe("formatDocument", () => {
  const pages = new Map([
    [1, ["Satu", "baris"]],
    [2, []],
    [3, ["Tiga"]],
  ]);

  it("hanya memuat halaman terpilih, dengan penanda halaman", () => {
    expect(formatDocument(pages, [1, 3], { markers: true, unwrap: false })).toBe("--- Halaman 1 ---\nSatu\nbaris\n\n--- Halaman 3 ---\nTiga");
  });

  it("melewati halaman kosong tanpa penanda", () => {
    expect(formatDocument(pages, [1, 2, 3], { markers: false, unwrap: true })).toBe("Satu baris\n\nTiga");
  });
});

describe("textStats", () => {
  it("menghitung karakter dan kata", () => {
    expect(textStats("Halo, dunia! Ini PDF-nya 2026.")).toEqual({ chars: 30, words: 5 });
  });
});

describe("extractPageLines", () => {
  it("membaca baris dari PDF nyata", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([400, 400]);
    page.drawText("Judul dokumen", { x: 40, y: 340, size: 14, font });
    page.drawText("Baris pertama isi.", { x: 40, y: 300, size: 11, font });
    page.drawText("Baris kedua isi.", { x: 40, y: 286, size: 11, font });
    const pdf = await getDocument({ data: await doc.save(), standardFontDataUrl: "node_modules/pdfjs-dist/standard_fonts/" }).promise;
    expect(await extractPageLines(pdf as unknown as PDFDocumentProxy, 1)).toEqual(["Judul dokumen", "", "Baris pertama isi.", "Baris kedua isi."]);
    await pdf.destroy();
  });
});
