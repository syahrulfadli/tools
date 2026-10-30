import { describe, expect, it } from "vitest";
import { parseJpeg } from "./jpeg";
import { imageMatrix, MM, pageLayout, rotatedSize, type Rotation } from "./layout";

/** JPEG buatan: APP1 Exif (opsional) + SOF0 berukuran 3×2. */
function fakeJpeg(orientation?: number, littleEndian = false) {
  const bytes: number[] = [0xff, 0xd8];
  if (orientation) {
    const u16 = (n: number) => (littleEndian ? [n & 0xff, n >> 8] : [n >> 8, n & 0xff]);
    const u32 = (n: number) => (littleEndian ? [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24] : [n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]);
    const tiff = [...(littleEndian ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8), ...u16(1), ...u16(0x0112), ...u16(3), ...u32(1), ...u16(orientation), 0, 0, ...u32(0)];
    const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
    bytes.push(0xff, 0xe1, (payload.length + 2) >> 8, (payload.length + 2) & 0xff, ...payload);
  }
  bytes.push(0xff, 0xc0, 0, 17, 8, 0, 2, 0, 3, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1);
  bytes.push(0xff, 0xd9);
  return new Uint8Array(bytes);
}

describe("parseJpeg", () => {
  it("membaca ukuran tersimpan dan jumlah kanal", () => {
    expect(parseJpeg(fakeJpeg())).toEqual({ width: 3, height: 2, components: 3, orientation: 1 });
  });

  it("membaca orientasi EXIF big- dan little-endian", () => {
    expect(parseJpeg(fakeJpeg(6))?.orientation).toBe(6);
    expect(parseJpeg(fakeJpeg(8, true))?.orientation).toBe(8);
  });

  it("menolak file yang bukan JPEG", () => {
    expect(parseJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });
});

describe("pageLayout", () => {
  const a4 = { pageSize: "a4", orientation: "auto", margin: 10 } as const;

  it("memilih lanskap otomatis untuk gambar lebar dan memuatnya di tengah", () => {
    const page = pageLayout(4000, 3000, a4);
    expect(page.width).toBeCloseTo(297 * MM);
    expect(page.height).toBeCloseTo(210 * MM);
    expect(page.box.height).toBeCloseTo((210 - 20) * MM);
    expect(page.box.x + page.box.width / 2).toBeCloseTo(page.width / 2);
  });

  it("menghormati orientasi paksa", () => {
    const page = pageLayout(4000, 3000, { ...a4, orientation: "portrait" });
    expect(page.width).toBeLessThan(page.height);
    expect(page.box.width).toBeCloseTo((210 - 20) * MM);
  });

  it("halaman sesuai gambar: 96 dpi plus margin", () => {
    const page = pageLayout(800, 600, { pageSize: "image", orientation: "auto", margin: 0 });
    expect(page).toEqual({ width: 600, height: 450, box: { x: 0, y: 0, width: 600, height: 450 } });
  });

  it("rotasi 90/270 menukar ukuran", () => {
    expect(rotatedSize(4000, 3000, 90)).toEqual({ width: 3000, height: 4000 });
    expect(rotatedSize(4000, 3000, 180)).toEqual({ width: 4000, height: 3000 });
  });
});

/** Ke mana sudut kiri atas gambar tersimpan (u=0, v=1 di ruang satuan PDF) mendarat. */
function topLeft(m: number[]) {
  const [, , c, d, e, f] = m;
  return { x: c + e, y: d + f };
}

describe("imageMatrix", () => {
  const box = { x: 10, y: 20, width: 300, height: 200 };
  const pageH = 1000;
  // Sudut kotak dalam koordinat PDF (y ke atas).
  const left = 10;
  const right = 310;
  const top = pageH - 20;
  const bottom = pageH - 220;

  const cases: [number, Rotation, { x: number; y: number }][] = [
    [1, 0, { x: left, y: top }], // tegak
    [2, 0, { x: right, y: top }], // cermin horizontal
    [3, 0, { x: right, y: bottom }], // 180°
    [4, 0, { x: left, y: bottom }], // cermin vertikal
    [6, 0, { x: right, y: top }], // perlu diputar 90° CW: kiri atas → kanan atas
    [8, 0, { x: left, y: bottom }], // perlu diputar 90° CCW
    [5, 0, { x: left, y: top }], // transpose
    [7, 0, { x: right, y: bottom }], // transverse
    [1, 90, { x: right, y: top }], // putar pengguna 90° CW
    [1, 270, { x: left, y: bottom }],
    [6, 270, { x: left, y: top }], // EXIF 90° CW lalu pengguna 90° CCW = tegak
  ];

  for (const [orientation, rotation, expected] of cases) {
    it(`EXIF ${orientation} + putar ${rotation}° menaruh sudut kiri atas di tempat yang benar`, () => {
      const point = topLeft(imageMatrix(box, pageH, orientation, rotation));
      expect(point.x).toBeCloseTo(expected.x);
      expect(point.y).toBeCloseTo(expected.y);
    });
  }

  it("selalu mengisi tepat kotaknya", () => {
    for (const orientation of [1, 2, 3, 4, 5, 6, 7, 8]) {
      for (const rotation of [0, 90, 180, 270] as Rotation[]) {
        const [a, b, c, d, e, f] = imageMatrix(box, pageH, orientation, rotation);
        const xs = [0, 1].flatMap((u) => [0, 1].map((v) => a * u + c * v + e));
        const ys = [0, 1].flatMap((u) => [0, 1].map((v) => b * u + d * v + f));
        expect(Math.min(...xs)).toBeCloseTo(left);
        expect(Math.max(...xs)).toBeCloseTo(right);
        expect(Math.min(...ys)).toBeCloseTo(bottom);
        expect(Math.max(...ys)).toBeCloseTo(top);
      }
    }
  });
});
