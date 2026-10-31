import { describe, expect, it } from "vitest";
import { embedSvg, traceSize } from "./output";
import { hexColor, medianCutPalette, prepare, traceToSvg, type Raster } from "./trace";

/** Gambar uji: latar `bg`, persegi `fg` di x 2–5, y 3–6. */
function squareImage(fg: number[], bg: number[], width = 10, height = 8): Raster {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set(x >= 2 && x < 6 && y >= 3 && y < 7 ? fg : bg, (y * width + x) * 4);
  }
  return { width, height, data };
}

const RED = [200, 0, 0, 255];
const WHITE = [255, 255, 255, 255];
const CLEAR = [0, 0, 0, 0];

describe("traceSize", () => {
  it("memperkecil sisi terpanjang tanpa memperbesar", () => {
    expect(traceSize(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 });
    expect(traceSize(300, 200, 1000)).toEqual({ width: 300, height: 200 });
  });
});

describe("prepare", () => {
  it("menjadikan alfa biner", () => {
    const raster = { width: 2, height: 1, data: new Uint8ClampedArray([10, 20, 30, 200, 10, 20, 30, 60]) };
    expect(Array.from(prepare(raster, { mode: "color", threshold: 128 }).data)).toEqual([10, 20, 30, 255, 0, 0, 0, 0]);
  });

  it("mode hitam putih: gelap jadi hitam, terang dan transparan jadi kosong", () => {
    const raster = { width: 3, height: 1, data: new Uint8ClampedArray([20, 20, 20, 255, 240, 240, 240, 255, 20, 20, 20, 0]) };
    expect(Array.from(prepare(raster, { mode: "mono", threshold: 128 }).data)).toEqual([0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("medianCutPalette", () => {
  it("menemukan warna kecil di samping warna dominan", () => {
    const palette = medianCutPalette(squareImage(RED, WHITE), 2).map(hexColor).sort();
    expect(palette).toEqual(["#c80000", "#ffffff"]);
  });

  it("mengabaikan piksel transparan", () => {
    expect(medianCutPalette(squareImage(RED, CLEAR), 4).map(hexColor)).toEqual(["#c80000"]);
    expect(medianCutPalette(squareImage(CLEAR, CLEAR), 4)).toEqual([]);
  });
});

describe("traceToSvg", () => {
  it("melacak persegi pada koordinat gambar, warna terluas digambar dulu", () => {
    const result = traceToSvg(squareImage(RED, WHITE), { mode: "color", colors: 2, detail: "high", threshold: 128 }, { width: 20, height: 16 });
    expect(result.colors).toBe(2);
    expect(result.svg).toContain('width="20" height="16" viewBox="0 0 10 8"');
    const fills = [...result.svg.matchAll(/fill="(#[0-9a-f]{6})"/g)].map((m) => m[1]);
    expect(fills).toEqual(["#ffffff", "#c80000"]);
    expect(result.svg).toContain('d="M 2 3 L 6 3 L 6 7 L 2 7 L 2 3 Z"');
  });

  it("area transparan tetap kosong", () => {
    const result = traceToSvg(squareImage(RED, CLEAR), { mode: "color", colors: 8, detail: "medium", threshold: 128 }, { width: 10, height: 8 });
    expect(result.colors).toBe(1);
    expect(result.shapes).toBe(1);
  });

  it("mode hitam putih hanya menghasilkan bentuk hitam tanpa garis tepi", () => {
    const result = traceToSvg(squareImage([30, 30, 30, 255], WHITE), { mode: "mono", colors: 2, detail: "medium", threshold: 128 }, { width: 10, height: 8 });
    expect(result.svg.match(/<path /g)).toHaveLength(1);
    expect(result.svg).toContain('<path fill="#000000" d=');
  });

  it("melaporkan progres per warna", () => {
    const calls: [number, number][] = [];
    traceToSvg(squareImage(RED, WHITE), { mode: "color", colors: 2, detail: "low", threshold: 128 }, { width: 10, height: 8 }, (done, total) => calls.push([done, total]));
    expect(calls).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
});

describe("embedSvg", () => {
  it("membungkus gambar asli pada ukuran aslinya", () => {
    expect(embedSvg("data:image/png;base64,AAAA", 640, 480)).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">\n<image width="640" height="480" href="data:image/png;base64,AAAA"/>\n</svg>\n',
    );
  });
});
