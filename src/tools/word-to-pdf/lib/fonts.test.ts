import { describe, expect, it } from "vitest";
import { withFallback } from "./fonts";

describe("withFallback", () => {
  it("menambah kembaran bermetrik sama dan keluarga generik", () => {
    expect(withFallback("Calibri")).toBe("Calibri, Carlito, sans-serif");
    expect(withFallback("Cambria")).toBe("Cambria, Caladea, serif");
    expect(withFallback("'Times New Roman'")).toBe('"Times New Roman", "Liberation Serif", Tinos, serif');
    expect(withFallback("Consolas")).toBe("Consolas, monospace");
  });

  it("memakai generik dari font pertama yang dikenal", () => {
    expect(withFallback('"Segoe UI", Cambria')).toBe('"Segoe UI", Cambria, Caladea, sans-serif');
    expect(withFallback("Font Kantor, Georgia")).toBe('"Font Kantor", Georgia, serif');
  });

  it("membiarkan daftar yang sudah punya generik, tak dikenal, atau berisi var()", () => {
    expect(withFallback("Arial, sans-serif")).toBe("Arial, sans-serif");
    expect(withFallback("Wingdings")).toBe("Wingdings");
    expect(withFallback("var(--docx-minorHAnsi-font)")).toBe("var(--docx-minorHAnsi-font)");
  });

  it("tidak menggandakan kembaran yang sudah ada", () => {
    expect(withFallback("Calibri, Carlito")).toBe("Calibri, Carlito, sans-serif");
  });
});
