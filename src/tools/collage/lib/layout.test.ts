import { describe, expect, it } from "vitest";
import { cellRects, outputSize, snapRect } from "./layout";
import { panBy, placeImage, visibleArea } from "./crop";

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

describe("placeImage: isi penuh (cover)", () => {
  it("menutupi sel dan memotong sisi berlebih secara seimbang", () => {
    const p = placeImage(4000, 3000, 500, 500, { zoom: 1, x: 0, y: 0 }, "cover");
    expect(p.height).toBeCloseTo(500);
    expect(p.width).toBeCloseTo(666.667, 2);
    expect(p.x).toBeCloseTo(-83.333, 2);
    expect(p.y).toBeCloseTo(0);
  });

  it("x = -1 menampilkan tepi kiri, x = 1 tepi kanan", () => {
    expect(placeImage(4000, 3000, 500, 500, { zoom: 1, x: -1, y: 0 }, "cover").x).toBeCloseTo(0);
    const right = placeImage(4000, 3000, 500, 500, { zoom: 1, x: 1, y: 0 }, "cover");
    expect(right.x + right.width).toBeCloseTo(500);
  });

  it("posisi sama secara proporsional di resolusi berbeda", () => {
    const framing = { zoom: 1.7, x: 0.3, y: -0.4 };
    const small = placeImage(4000, 3000, 200, 250, framing, "cover");
    const large = placeImage(4000, 3000, 2000, 2500, framing, "cover");
    expect(large.x / small.x).toBeCloseTo(10, 6);
    expect(large.height / small.height).toBeCloseTo(10, 6);
  });
});

describe("placeImage: utuh (contain)", () => {
  it("seluruh foto masuk ke sel dan berada di tengah", () => {
    const p = placeImage(4000, 3000, 500, 500, { zoom: 1, x: 0, y: 0 }, "contain");
    expect(p.width).toBeCloseTo(500);
    expect(p.height).toBeCloseTo(375);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(62.5);
  });

  it("x/y menggeser letak foto di ruang sisa", () => {
    expect(placeImage(4000, 3000, 500, 500, { zoom: 1, x: 0, y: -1 }, "contain").y).toBeCloseTo(0);
    expect(placeImage(4000, 3000, 500, 500, { zoom: 1, x: 0, y: 1 }, "contain").y).toBeCloseTo(125);
  });

  it("bagian terlihat = foto saja, tidak termasuk ruang sisa", () => {
    const p = placeImage(4000, 3000, 500, 500, { zoom: 1, x: 0, y: 0 }, "contain");
    expect(visibleArea(500, 500, p)).toEqual({ x: 0, y: 62.5, width: 500, height: 375 });
  });

  it("zoom melewati sel memotong lagi, dan bagian terlihat dibatasi sel", () => {
    const p = placeImage(4000, 3000, 500, 500, { zoom: 2, x: 0, y: 0 }, "contain");
    expect(p.width).toBeCloseTo(1000);
    expect(visibleArea(500, 500, p)).toEqual({ x: 0, y: 0, width: 500, height: 500 });
  });
});

describe("panBy", () => {
  it("menyeret ke kanan menggeser foto ke kanan (isi penuh)", () => {
    const before = placeImage(4000, 3000, 500, 500, { zoom: 1, x: 0, y: 0 }, "cover");
    const next = panBy({ zoom: 1, x: 0, y: 0 }, 50, 0, 4000, 3000, 500, 500, "cover");
    const after = placeImage(4000, 3000, 500, 500, next, "cover");
    expect(after.x - before.x).toBeCloseTo(50);
    expect(next.y).toBe(0);
  });

  it("menyeret ke bawah menggeser foto ke bawah (utuh)", () => {
    const next = panBy({ zoom: 1, x: 0, y: 0 }, 0, 40, 4000, 3000, 500, 500, "contain");
    expect(placeImage(4000, 3000, 500, 500, next, "contain").y).toBeCloseTo(102.5);
  });

  it("tidak bisa digeser melewati batas", () => {
    expect(panBy({ zoom: 1, x: 0, y: 0 }, 99999, 0, 4000, 3000, 500, 500, "cover").x).toBe(-1);
    expect(panBy({ zoom: 1, x: 0, y: 0 }, 0, 99999, 4000, 3000, 500, 500, "contain").y).toBe(1);
  });
});
