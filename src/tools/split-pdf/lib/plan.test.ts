import { describe, expect, it } from "vitest";
import { partName, planEvery, planRanges } from "./plan";

describe("planRanges", () => {
  it("memisah per bagian bertanda koma", () => {
    expect(planRanges("1-3, 4-6, 9", 10)).toEqual({ ok: true, parts: [[1, 2, 3], [4, 5, 6], [9]] });
  });
  it("mengizinkan tumpang tindih", () => {
    expect(planRanges("1-2, 2-3", 5)).toEqual({ ok: true, parts: [[1, 2], [2, 3]] });
  });
  it("menolak kosong, di luar jumlah halaman, dan teks asing", () => {
    expect(planRanges("  ", 5).ok).toBe(false);
    expect(planRanges("1-9", 5)).toMatchObject({ ok: false, error: "Halaman hanya 1 sampai 5." });
    expect(planRanges("a", 5).ok).toBe(false);
  });
});

describe("planEvery", () => {
  it("membagi rata dan menyisakan bagian akhir", () => {
    expect(planEvery(2, 5)).toEqual({ ok: true, parts: [[1, 2], [3, 4], [5]] });
    expect(planEvery(1, 3)).toEqual({ ok: true, parts: [[1], [2], [3]] });
  });
  it("ukuran lebih besar dari halaman jadi satu PDF", () => {
    expect(planEvery(10, 3)).toEqual({ ok: true, parts: [[1, 2, 3]] });
  });
  it("menolak ukuran tidak sah", () => {
    expect(planEvery(0, 3).ok).toBe(false);
    expect(planEvery(1.5, 3).ok).toBe(false);
    expect(planEvery(Number.NaN, 3).ok).toBe(false);
  });
});

describe("partName", () => {
  it("menulis halaman tunggal, rentang, dan gabungan", () => {
    expect(partName("laporan", [3])).toBe("laporan-hal-3.pdf");
    expect(partName("laporan", [1, 2, 3])).toBe("laporan-hal-1-3.pdf");
    expect(partName("laporan", [1, 2, 3, 8])).toBe("laporan-hal-1-3_8.pdf");
  });
});
