import { describe, expect, it } from "vitest";
import { deleteSources, initialPages, isUnchanged, movePage, outputPlan, reversePages, rotateAll, rotatePage, summarize, toggleDeleted } from "./arrange";

describe("susunan halaman", () => {
  it("mulai dari urutan asli tanpa perubahan", () => {
    const pages = initialPages(3);
    expect(pages.map((p) => p.source)).toEqual([1, 2, 3]);
    expect(isUnchanged(pages)).toBe(true);
    expect(outputPlan(pages)).toEqual([
      { page: 1, rotate: 0 },
      { page: 2, rotate: 0 },
      { page: 3, rotate: 0 },
    ]);
  });

  it("memindah halaman dan menandai urutan berubah", () => {
    const pages = movePage(initialPages(4), 3, 0);
    expect(pages.map((p) => p.source)).toEqual([4, 1, 2, 3]);
    expect(summarize(pages).moved).toBe(true);
    expect(isUnchanged(pages)).toBe(false);
  });

  it("memutar satu halaman dan berputar kembali ke 0 setelah 360°", () => {
    let pages = rotatePage(initialPages(2), 1, 90);
    expect(pages[1].rotate).toBe(90);
    pages = rotatePage(pages, 1, -180);
    expect(pages[1].rotate).toBe(270);
    pages = rotatePage(pages, 1, 90);
    expect(pages[1].rotate).toBe(0);
  });

  it("memutar semua halaman kecuali yang dihapus", () => {
    const pages = rotateAll(toggleDeleted(initialPages(3), 1), 90);
    expect(pages.map((p) => p.rotate)).toEqual([90, 0, 90]);
  });

  it("halaman terhapus tidak ikut hasil dan bisa dikembalikan", () => {
    let pages = deleteSources(initialPages(5), [2, 4]);
    expect(outputPlan(pages).map((p) => p.page)).toEqual([1, 3, 5]);
    expect(summarize(pages)).toEqual({ kept: 3, deleted: 2, rotated: 0, moved: false });
    pages = toggleDeleted(pages, 1);
    expect(outputPlan(pages).map((p) => p.page)).toEqual([1, 2, 3, 5]);
  });

  it("membalik urutan", () => {
    expect(reversePages(initialPages(3)).map((p) => p.source)).toEqual([3, 2, 1]);
  });
});
