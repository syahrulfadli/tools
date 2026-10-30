import { describe, expect, it } from "vitest";
import { clampPlacement, placeAt, placementHeight, toPdfRect } from "./placement";
import { alphaBounds, strokeBounds, whiteToTransparent } from "./signature";

describe("placement", () => {
  // Halaman A4 tegak: lebar/tinggi ≈ 0,707. Tanda tangan 2:1 (rasio tinggi/lebar 0,5).
  const aspect = 595 / 842;
  const ratio = 0.5;

  it("menghitung tinggi relatif dari rasio gambar dan halaman", () => {
    expect(placementHeight(0.4, ratio, aspect)).toBeCloseTo(0.4 * 0.5 * aspect);
  });

  it("berpusat di titik klik", () => {
    const p = placeAt("a", 1, 0.5, 0.5, ratio, aspect, 0.2);
    const h = placementHeight(0.2, ratio, aspect);
    expect(p.x).toBeCloseTo(0.4);
    expect(p.y).toBeCloseTo(0.5 - h / 2);
  });

  it("dijepit agar tidak keluar halaman", () => {
    const p = clampPlacement({ id: "a", page: 1, x: 0.95, y: -0.2, w: 0.3 }, ratio, aspect);
    expect(p.x).toBeCloseTo(0.7);
    expect(p.y).toBe(0);
    expect(clampPlacement({ ...p, w: 0.001 }, ratio, aspect).w).toBe(0.04);
  });

  it("mengecilkan tanda tangan yang lebih tinggi dari halaman", () => {
    // Gambar sangat tinggi (rasio 4) di halaman mendatar.
    const p = clampPlacement({ id: "a", page: 1, x: 0, y: 0, w: 1 }, 4, 842 / 595);
    expect(placementHeight(p.w, 4, 842 / 595)).toBeCloseTo(1);
  });

  it("mengubah ke persegi poin PDF dengan asal kiri bawah", () => {
    const rect = toPdfRect({ id: "a", page: 1, x: 0.5, y: 0.25, w: 0.2 }, ratio, { width: 600, height: 800 });
    expect(rect).toEqual({ x: 300, y: 800 - 200 - 60, width: 120, height: 60 });
  });
});

describe("signature", () => {
  it("batas goresan memuat tebal garis", () => {
    expect(
      strokeBounds(
        [
          [
            [10, 20],
            [30, 25],
          ],
          [[15, 40]],
        ],
        4,
      ),
    ).toEqual({ x: 7, y: 17, width: 26, height: 26 });
    expect(strokeBounds([], 4)).toBeNull();
  });

  it("membuat putih transparan dan mempertahankan tinta", () => {
    const data = new Uint8ClampedArray([255, 255, 255, 255, 20, 20, 20, 255, 230, 230, 230, 255]);
    whiteToTransparent(data, 200);
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(255);
    expect(data[11]).toBeGreaterThan(0);
    expect(data[11]).toBeLessThan(255);
  });

  it("mencari area bertinta dari kanal alfa", () => {
    const width = 4;
    const height = 3;
    const data = new Uint8ClampedArray(width * height * 4);
    data[(1 * width + 1) * 4 + 3] = 255;
    data[(2 * width + 2) * 4 + 3] = 255;
    expect(alphaBounds(data, width, height)).toEqual({ x: 1, y: 1, width: 2, height: 2 });
    expect(alphaBounds(new Uint8ClampedArray(16), 2, 2)).toBeNull();
  });
});
