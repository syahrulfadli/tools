import { describe, expect, it } from "vitest";
import { sizeChange, targetSize } from "./convert";

describe("targetSize", () => {
  it("tidak pernah memperbesar", () => {
    expect(targetSize(800, 600, 2048)).toEqual({ width: 800, height: 600 });
    expect(targetSize(800, 600, 0)).toEqual({ width: 800, height: 600 });
  });

  it("memperkecil sisi terpanjang ke batas", () => {
    expect(targetSize(4000, 3000, 1080)).toEqual({ width: 1080, height: 810 });
    expect(targetSize(1000, 5000, 2048)).toEqual({ width: 410, height: 2048 });
  });

  it("menjaga kanvas di bawah batas luas browser", () => {
    const { width, height } = targetSize(10000, 10000, 0);
    expect(width * height).toBeLessThanOrEqual(16_777_216);
  });
});

describe("sizeChange", () => {
  it("menghitung persen dari ukuran awal", () => {
    expect(sizeChange(2_400_000, 384_000)).toBe(-84);
    expect(sizeChange(100, 150)).toBe(50);
    expect(sizeChange(0, 10)).toBe(0);
  });
});
