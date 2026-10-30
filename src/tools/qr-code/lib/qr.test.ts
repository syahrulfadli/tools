import { describe, expect, it } from "vitest";
import { MAX_BYTES, byteLength, colorWarning, makeQr, normalizeLink, pixelsPerModule, qrFilename, qrPath, qrSvg } from "./qr";

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
