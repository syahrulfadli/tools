import { describe, expect, it } from "vitest";
import { breakBeforeNewSections, type BodyElement } from "./sections";

const para = (sectionType?: string): BodyElement =>
  sectionType === undefined ? { type: "paragraph" } : { type: "paragraph", sectionProps: sectionType ? { type: sectionType } : {} };

describe("breakBeforeNewSections", () => {
  it("bagian baru tanpa jenis (bawaan Word: halaman berikutnya) mulai di halaman baru", () => {
    const body = [para(), para(""), para(), para()];
    breakBeforeNewSections(body, {});
    expect(body.map((p) => Boolean(p.pageBreakBefore))).toEqual([false, false, true, false]);
  });

  it("jenis bagian dibaca dari bagian berikutnya, bukan yang berakhir", () => {
    // Bagian 2 diakhiri paragraf ke-4 (continuous); bagian 3 memakai props badan (nextPage).
    const body = [para(""), para(), para(), para("continuous"), para()];
    breakBeforeNewSections(body, { type: "nextPage" });
    expect(body.map((p) => Boolean(p.pageBreakBefore))).toEqual([false, false, false, false, true]);
    // Bagian 2 sendiri continuous: paragraf ke-2 tidak dipindah ke halaman baru.
    const continuous = [para(""), para(), para()];
    breakBeforeNewSections(continuous, { type: "continuous" });
    expect(continuous.some((p) => p.pageBreakBefore)).toBe(false);
  });

  it("tabel di awal bagian dibiarkan", () => {
    const body: BodyElement[] = [para(""), { type: "table" }, para()];
    breakBeforeNewSections(body, {});
    expect(body.some((p) => p.pageBreakBefore)).toBe(false);
  });
});
