import { describe, expect, it } from "vitest";
import { formatPageRanges, pageFilename, parsePageRanges } from "./pages";

describe("parsePageRanges", () => {
  it("membaca angka dan rentang, tanpa duplikat, terurut", () => {
    expect(parsePageRanges("8, 1-3, 2", 10)).toEqual({ ok: true, pages: [1, 2, 3, 8] });
    expect(parsePageRanges("5-3", 10)).toEqual({ ok: true, pages: [3, 4, 5] });
    expect(parsePageRanges("1 – 2;4", 10)).toEqual({ ok: true, pages: [1, 2, 4] });
  });

  it("menolak halaman di luar dokumen dan teks asing", () => {
    expect(parsePageRanges("0-2", 10).ok).toBe(false);
    expect(parsePageRanges("11", 10).ok).toBe(false);
    expect(parsePageRanges("satu", 10).ok).toBe(false);
    expect(parsePageRanges("  ", 10).ok).toBe(false);
  });
});

describe("formatPageRanges", () => {
  it("meringkas halaman berurutan jadi rentang", () => {
    expect(formatPageRanges([8, 1, 2, 3, 10, 11])).toBe("1-3, 8, 10-11");
    expect(formatPageRanges([])).toBe("");
  });
});

describe("pageFilename", () => {
  it("memberi nol di depan sesuai jumlah halaman", () => {
    expect(pageFilename("laporan", 3, 120)).toBe("laporan-hal-003.jpg");
    expect(pageFilename("laporan", 3, 9)).toBe("laporan-hal-3.jpg");
    expect(pageFilename("laporan", 12, 40, "png")).toBe("laporan-hal-12.png");
  });
});
