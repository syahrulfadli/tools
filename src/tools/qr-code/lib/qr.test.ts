import { describe, expect, it } from "vitest";
import { LOGO_MAX_SCALE, MAX_BYTES, byteLength, colorWarning, logoBox, logoCoverage, logoImageRect, makeQr, normalizeLink, pixelsPerModule, qrFilename, qrPath, qrSvg } from "./qr";

describe("makeQr", () => {
  it("membuat matriks versi terkecil yang muat", () => {
    const qr = makeQr("halo", "M");
    expect(qr.version).toBe(1);
    expect(qr.size).toBe(21);
    expect(qr.modules).toHaveLength(21);
  });

  it("punya tiga pola penanda di sudut", () => {
    const { modules, size } = makeQr("https://contoh.com", "Q");
    // Pola penanda 7×7: baris atas penuh gelap, lalu cincin terang di dalamnya.
    for (const [r, c] of [
      [0, 0],
      [0, size - 7],
      [size - 7, 0],
    ]) {
      expect(modules[r].slice(c, c + 7).every(Boolean)).toBe(true);
      expect(modules[r + 1][c + 1]).toBe(false);
      expect(modules[r + 3][c + 3]).toBe(true);
    }
  });

  it("menghitung byte sebagai UTF-8", () => {
    expect(byteLength("é")).toBe(2);
    expect(makeQr("Rp 10.000 — lunas ✓", "M").size).toBeGreaterThanOrEqual(21);
  });

  it("menolak isi yang melebihi kapasitas", () => {
    expect(() => makeQr("a".repeat(MAX_BYTES.H + 1), "H")).toThrow(/terlalu panjang/);
    expect(makeQr("a".repeat(MAX_BYTES.L), "L").version).toBe(40);
  });
});

describe("SVG", () => {
  it("menggabung modul gelap berurutan dalam satu baris", () => {
    expect(qrPath([[true, true, false, true]], 1)).toBe("M1 1h2v1h-2zM4 1h1v1h-1z");
  });

  it("menulis latar hanya bila tidak transparan", () => {
    const qr = makeQr("x", "L");
    expect(qrSvg(qr, { margin: 4, foreground: "#000000", background: "#ffffff" })).toContain('<rect width="29" height="29" fill="#ffffff"/>');
    expect(qrSvg(qr, { margin: 0, foreground: "#000000", background: "transparent" })).not.toContain("<rect");
  });

  it("memilih piksel per modul yang bulat", () => {
    const qr = makeQr("x", "L");
    expect(pixelsPerModule(qr, 4, 1024)).toBe(35);
    expect(pixelsPerModule(qr, 4, 10)).toBe(1);
  });
});

describe("normalizeLink", () => {
  it("menambah https:// pada domain polos", () => {
    expect(normalizeLink(" contoh.com/promo ")).toEqual({ ok: true, url: "https://contoh.com/promo" });
  });

  it("mempertahankan skema yang sudah ada", () => {
    expect(normalizeLink("mailto:halo@contoh.com")).toEqual({ ok: true, url: "mailto:halo@contoh.com" });
    expect(normalizeLink("http://localhost:5173")).toEqual({ ok: true, url: "http://localhost:5173" });
  });

  it("menolak kalimat dan nama tanpa domain", () => {
    expect(normalizeLink("halo dunia").ok).toBe(false);
    expect(normalizeLink("contoh").ok).toBe(false);
    expect(normalizeLink("").ok).toBe(false);
  });
});

describe("qrFilename", () => {
  it("membuat nama dari isi", () => {
    expect(qrFilename("https://www.Contoh.com/Promo?id=1")).toBe("qr-contoh-com-promo-id-1");
    expect(qrFilename("Kafé Ñ")).toBe("qr-kafe-n");
    expect(qrFilename("✓✓")).toBe("qr-code");
  });
});

describe("colorWarning", () => {
  it("menerima hitam di atas putih atau transparan", () => {
    expect(colorWarning("#000000", "#ffffff")).toBeNull();
    expect(colorWarning("#1b6c80", "transparent")).toBeNull();
  });

  it("memperingatkan kontras rendah dan warna terbalik", () => {
    expect(colorWarning("#bbbbbb", "#ffffff")).toMatch(/mirip/);
    expect(colorWarning("#ffffff", "#000000")).toMatch(/terbalik/);
  });
});

describe("logo", () => {
  it("kotak logo berpusat di grid dengan paritas yang sama", () => {
    const qr = makeQr("https://contoh.com", "H"); // 29 modul
    const box = logoBox(qr, 4, 0.2)!;
    expect(box.size % 2).toBe(qr.size % 2);
    expect(box.x).toBe(4 + (qr.size - box.size) / 2);
    expect(box.x).toBe(box.y);
    expect(logoBox(qr, 4, 0)).toBeNull();
    expect(logoCoverage(qr, box)).toBeCloseTo((box.size / qr.size) ** 2);
  });

  it("modul di dalam kotak logo dikosongkan", () => {
    const modules = [[true, true, true]];
    expect(qrPath(modules, 0, { x: 1, y: 0, size: 1 })).toBe("M0 0h1v1h-1zM2 0h1v1h-1z");
  });

  it("logo berjarak 1 modul dan mempertahankan rasio", () => {
    expect(logoImageRect({ x: 10, y: 10, size: 9 }, 2)).toEqual({ x: 11, y: 12.75, width: 7, height: 3.5 });
    expect(logoImageRect({ x: 10, y: 10, size: 9 }, 0.5)).toEqual({ x: 12.75, y: 11, width: 3.5, height: 7 });
  });

  it("SVG menyematkan gambar logo", () => {
    const qr = makeQr("x", "H");
    const svg = qrSvg(qr, { margin: 4, foreground: "#000000", background: "#ffffff" }, { href: "data:image/png;base64,AAAA", aspect: 1, box: logoBox(qr, 4, 0.25)! });
    expect(svg).toContain('<image href="data:image/png;base64,AAAA"');
  });

  it("tingkat Rendah tidak mengizinkan logo, batas naik bersama ketahanan", () => {
    expect(LOGO_MAX_SCALE.L).toBe(0);
    expect(LOGO_MAX_SCALE.M).toBeLessThan(LOGO_MAX_SCALE.Q);
    expect(LOGO_MAX_SCALE.Q).toBeLessThan(LOGO_MAX_SCALE.H);
  });
});
