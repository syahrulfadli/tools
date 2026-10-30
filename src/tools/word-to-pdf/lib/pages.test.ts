import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE, describePage, pageRules, pageSizeOf, parseLength, printedSheets } from "./pages";

describe("parseLength", () => {
  it("mengubah satuan ke pt", () => {
    expect(parseLength("595.30pt")).toBeCloseTo(595.3);
    expect(parseLength("96px")).toBe(72);
    expect(parseLength("1in")).toBe(72);
    expect(parseLength("210mm")).toBeCloseTo(595.28, 1);
    expect(parseLength("2.54cm")).toBeCloseTo(72);
  });

  it("menolak nilai kosong atau ekspresi", () => {
    expect(parseLength("")).toBeNull();
    expect(parseLength("calc(1pt + 2pt)")).toBeNull();
  });
});

describe("pageSizeOf", () => {
  it("memakai A4 bila dokumen tidak menyebut ukuran", () => {
    expect(pageSizeOf("", "")).toEqual(DEFAULT_PAGE);
    expect(pageSizeOf("612.00pt", "1008.00pt")).toEqual({ width: 612, height: 1008 });
  });
});

describe("describePage", () => {
  it("mengenali ukuran kertas umum dan orientasinya", () => {
    expect(describePage({ width: 595.3, height: 841.9 })).toBe("A4 potret");
    expect(describePage({ width: 841.9, height: 595.3 })).toBe("A4 lanskap");
    expect(describePage({ width: 612, height: 1008 })).toBe("Legal potret");
    expect(describePage({ width: 612, height: 792 })).toBe("Letter potret");
    // F4 dari Word Indonesia: 8,5 × 13 inci (215,9 × 330,2 mm).
    expect(describePage({ width: 612, height: 936 })).toBe("F4 potret");
  });

  it("menulis ukuran lain dalam mm", () => {
    expect(describePage({ width: 283.5, height: 425.2 })).toBe("100 × 150 mm");
  });
});

describe("pageRules", () => {
  it("satu @page bernama per ukuran unik", () => {
    const a4 = { width: 595.3, height: 841.9 };
    const landscape = { width: 841.9, height: 595.3 };
    const { css, names } = pageRules([a4, landscape, { width: 595.4, height: 841.9 }]);
    expect(names).toEqual(["docx-page-0", "docx-page-1", "docx-page-0"]);
    expect(css).toContain("@page { size: 595.3pt 841.9pt; margin: 0; }");
    expect(css).toContain("@page docx-page-1 { size: 841.9pt 595.3pt; margin: 0; }");
    expect(css.match(/@page docx-page-/g)).toHaveLength(2);
  });

  it("memakai A4 untuk dokumen kosong", () => {
    expect(pageRules([]).css).toContain("size: 595.3pt 841.9pt");
  });
});

describe("printedSheets", () => {
  it("satu lembar bila isi muat (dengan toleransi pembulatan)", () => {
    expect(printedSheets(841.9, 841.9, 72, 72)).toBe(1);
    expect(printedSheets(842.5, 841.9, 72, 72)).toBe(1);
  });

  it("isi yang lebih panjang berlanjut dengan margin yang sama", () => {
    // Area isi per lembar 697,9 pt; isi 1.400 pt + margin 144 pt butuh 3 lembar.
    expect(printedSheets(1544, 841.9, 72, 72)).toBe(3);
    expect(printedSheets(72 + 697.9 * 2 + 72, 841.9, 72, 72)).toBe(2);
  });
});
