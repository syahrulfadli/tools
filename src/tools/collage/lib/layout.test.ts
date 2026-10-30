import { describe, expect, it } from "vitest";
import { cellRects, outputSize, snapRect } from "./layout";
import { coverCrop, panBy } from "./crop";

describe("outputSize", () => {
  it("menaruh sisi terpanjang sesuai orientasi", () => {
    expect(outputSize(4, 5, 2048)).toEqual({ width: 1638, height: 2048 });
    expect(outputSize(16, 9, 1080)).toEqual({ width: 1080, height: 608 });
    expect(outputSize(1, 1, 4096)).toEqual({ width: 4096, height: 4096 });
  });
});

describe("cellRects", () => {
  it("membagi kanvas rata tanpa jarak", () => {
    const rects = cellRects(1000, 1000, { rows: 2, cols: 2, gap: 0, padding: 0 });
    expect(rects).toHaveLength(4);
    expect(rects[3]).toEqual({ x: 500, y: 500, width: 500, height: 500 });
  });

  it("sel terakhir berakhir tepat di tepi dalam", () => {
    const [w, h] = [1638, 2048];
    const settings = { rows: 3, cols: 3, gap: 12, padding: 40 };
    const rects = cellRects(w, h, settings);
    const last = rects[8];
    const pad = 40 * (1638 / 1000);
    expect(last.x + last.width).toBeCloseTo(w - pad, 6);
    expect(last.y + last.height).toBeCloseTo(h - pad, 6);
  });

  it("memperkecil jarak yang tidak muat sehingga sel tetap positif", () => {
    const rects = cellRects(100, 100, { rows: 8, cols: 8, gap: 80, padding: 120 });
    for (const rect of rects) {
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
    }
  });

  it("tepi sel yang dibulatkan bersambung tanpa celah saat jarak 0", () => {
    const rects = cellRects(1000, 999, { rows: 3, cols: 3, gap: 0, padding: 0 }).map(snapRect);
    expect(rects[0].x + rects[0].width).toBe(rects[1].x);
    expect(rects[0].y + rects[0].height).toBe(rects[3].y);
  });
});

describe("coverCrop", () => {
  it("menutupi sel dan memotong sisi yang berlebih di tengah", () => {
    const crop = coverCrop(4000, 3000, 500, 500, { zoom: 1, x: 0, y: 0 });
    expect(crop.sw).toBeCloseTo(3000);
    expect(crop.sh).toBeCloseTo(3000);
    expect(crop.sx).toBeCloseTo(500);
    expect(crop.sy).toBeCloseTo(0);
  });

  it("x = -1 menampilkan tepi kiri, x = 1 tepi kanan", () => {
    expect(coverCrop(4000, 3000, 500, 500, { zoom: 1, x: -1, y: 0 }).sx).toBeCloseTo(0);
    expect(coverCrop(4000, 3000, 500, 500, { zoom: 1, x: 1, y: 0 }).sx).toBeCloseTo(1000);
  });

  it("pembingkaian sama di resolusi berbeda", () => {
    const framing = { zoom: 1.7, x: 0.3, y: -0.4 };
    const small = coverCrop(4000, 3000, 200, 250, framing);
    const large = coverCrop(4000, 3000, 2000, 2500, framing);
    expect(small.sx).toBeCloseTo(large.sx, 6);
    expect(small.sh).toBeCloseTo(large.sh, 6);
  });
});

describe("panBy", () => {
  it("menyeret ke kanan memperlihatkan bagian kiri foto", () => {
    const next = panBy({ zoom: 1, x: 0, y: 0 }, 50, 0, 4000, 3000, 500, 500);
    expect(next.x).toBeLessThan(0);
    expect(next.y).toBe(0);
  });

  it("tidak bisa digeser melewati tepi foto", () => {
    const next = panBy({ zoom: 1, x: 0, y: 0 }, 99999, 0, 4000, 3000, 500, 500);
    expect(next.x).toBe(-1);
  });
});
