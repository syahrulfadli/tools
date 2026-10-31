import { describe, expect, it } from "vitest";
import { intrinsicSize, outputSize, parseLength, parseViewBox } from "./size";

describe("parseLength", () => {
  it("mengubah satuan CSS ke piksel", () => {
    expect(parseLength("100")).toBe(100);
    expect(parseLength("24px")).toBe(24);
    expect(parseLength("12pt")).toBe(16);
    expect(parseLength("1in")).toBe(96);
    expect(parseLength("2.54cm")).toBeCloseTo(96);
    expect(parseLength("210mm")).toBeCloseTo(793.7, 1);
    expect(parseLength(" 1.5e2 ")).toBe(150);
    expect(parseLength(".5em")).toBe(8);
  });

  it("menolak nilai yang tidak memberi ukuran tetap", () => {
    for (const value of ["100%", "auto", "", "0", "-5", "10vw", "abc", null, undefined]) {
      expect(parseLength(value)).toBeNull();
    }
  });
});

describe("parseViewBox", () => {
  it("menerima spasi dan koma", () => {
    expect(parseViewBox("0 0 24 24")).toEqual({ x: 0, y: 0, width: 24, height: 24 });
    expect(parseViewBox("-10,5, 200 100")).toEqual({ x: -10, y: 5, width: 200, height: 100 });
  });

  it("menolak viewBox tidak lengkap atau kosong", () => {
    expect(parseViewBox("0 0 24")).toBeNull();
    expect(parseViewBox("0 0 0 24")).toBeNull();
    expect(parseViewBox(null)).toBeNull();
  });
});

describe("intrinsicSize", () => {
  it("memakai width/height bila keduanya tertulis", () => {
    expect(intrinsicSize({ width: "48", height: "32", viewBox: "0 0 24 24" })).toEqual({ width: 48, height: 32, declared: true });
  });

  it("melengkapi sisi yang hilang dari rasio viewBox", () => {
    expect(intrinsicSize({ width: "200", viewBox: "0 0 100 50" })).toEqual({ width: 200, height: 100, declared: true });
    expect(intrinsicSize({ height: "100", viewBox: "0 0 100 50" })).toEqual({ width: 200, height: 100, declared: true });
  });

  it("memakai viewBox bila ukuran berupa persen atau tidak ada", () => {
    expect(intrinsicSize({ width: "100%", height: "100%", viewBox: "0 0 640 480" })).toEqual({ width: 640, height: 480, declared: true });
  });

  it("jatuh ke 300 × 150 tanpa ukuran dan viewBox", () => {
    expect(intrinsicSize({})).toEqual({ width: 300, height: 150, declared: false });
    expect(intrinsicSize({ width: "500" })).toEqual({ width: 500, height: 150, declared: true });
  });
});

describe("outputSize", () => {
  it("mengalikan dengan skala", () => {
    expect(outputSize({ width: 24, height: 24 }, { mode: "scale", scale: 4 })).toEqual({ width: 96, height: 96, limited: false });
  });

  it("lebar tetap menjaga rasio", () => {
    expect(outputSize({ width: 640, height: 480 }, { mode: "width", width: 1000 })).toEqual({ width: 1000, height: 750, limited: false });
    expect(outputSize({ width: 33.3, height: 10 }, { mode: "width", width: 100 })).toEqual({ width: 100, height: 30, limited: false });
  });

  it("dibatasi luas kanvas browser", () => {
    const out = outputSize({ width: 3000, height: 3000 }, { mode: "scale", scale: 4 });
    expect(out.limited).toBe(true);
    expect(out.width * out.height).toBeLessThanOrEqual(16_777_216);
  });
});
