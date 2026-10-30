import { describe, expect, it } from "vitest";
import { normalizeRotation, rotateVector, toUserSpace, visualSize, type PageBox } from "./pdf-geometry";

const box = (rotation: PageBox["rotation"]): PageBox => ({ x: 10, y: 20, width: 600, height: 800, rotation });

describe("normalizeRotation", () => {
  it("memetakan sudut apa pun ke kelipatan 90", () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(540)).toBe(180);
  });
});

describe("visualSize", () => {
  it("menukar sisi untuk 90 dan 270", () => {
    expect(visualSize(box(0))).toEqual({ width: 600, height: 800 });
    expect(visualSize(box(90))).toEqual({ width: 800, height: 600 });
    expect(visualSize(box(270))).toEqual({ width: 800, height: 600 });
  });
});

describe("toUserSpace", () => {
  it("tanpa rotasi hanya menggeser sebesar asal CropBox", () => {
    expect(toUserSpace(box(0), 5, 7)).toEqual({ x: 15, y: 27, angle: 0 });
  });

  // Sudut kiri bawah tampilan harus jatuh ke sudut ruang pengguna yang benar untuk tiap rotasi.
  it("memetakan sudut kiri bawah tampilan", () => {
    expect(toUserSpace(box(90), 0, 0)).toEqual({ x: 610, y: 20, angle: 90 });
    expect(toUserSpace(box(180), 0, 0)).toEqual({ x: 610, y: 820, angle: 180 });
    expect(toUserSpace(box(270), 0, 0)).toEqual({ x: 10, y: 820, angle: 270 });
  });

  it("arah kanan di tampilan sama dengan arah sudut teks di ruang pengguna", () => {
    for (const rotation of [0, 90, 180, 270] as const) {
      const a = toUserSpace(box(rotation), 0, 0);
      const b = toUserSpace(box(rotation), 1, 0);
      const dir = rotateVector(1, 0, a.angle);
      expect(b.x - a.x).toBeCloseTo(dir.x);
      expect(b.y - a.y).toBeCloseTo(dir.y);
    }
  });

  it("arah atas di tampilan sama dengan arah atas teks yang diputar", () => {
    for (const rotation of [0, 90, 180, 270] as const) {
      const a = toUserSpace(box(rotation), 0, 0);
      const b = toUserSpace(box(rotation), 0, 1);
      const up = rotateVector(0, 1, a.angle);
      expect(b.x - a.x).toBeCloseTo(up.x);
      expect(b.y - a.y).toBeCloseTo(up.y);
    }
  });
});
