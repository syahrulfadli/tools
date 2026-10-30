import { describe, expect, it } from "vitest";
import { outputName, shouldKeepOriginal } from "./compress";

describe("outputName", () => {
  it("memakai ekstensi format hasil", () => {
    expect(outputName("foto.png", "image/webp", false)).toBe("foto-kompres.webp");
    expect(outputName("laporan.final.jpeg", "image/jpeg", false)).toBe("laporan.final-kompres.jpg");
  });

  it("mempertahankan ekstensi asli bila file asli dipakai", () => {
    expect(outputName("foto.JPEG", "image/jpeg", true)).toBe("foto-kompres.JPEG");
  });

  it("menangani nama tanpa ekstensi", () => {
    expect(outputName("foto", "image/png", false)).toBe("foto-kompres.png");
  });
});

describe("shouldKeepOriginal", () => {
  const original = { size: 1000, type: "image/jpeg" };

  it("mempertahankan asli bila hasil tidak lebih kecil dengan format dan piksel sama", () => {
    expect(shouldKeepOriginal(original, { size: 1200 }, "image/jpeg", false)).toBe(true);
    expect(shouldKeepOriginal(original, { size: 1000 }, "image/jpeg", false)).toBe(true);
  });

  it("memakai hasil bila lebih kecil", () => {
    expect(shouldKeepOriginal(original, { size: 400 }, "image/jpeg", false)).toBe(false);
  });

  it("memakai hasil bila format atau ukuran piksel berubah", () => {
    expect(shouldKeepOriginal(original, { size: 1200 }, "image/webp", false)).toBe(false);
    expect(shouldKeepOriginal(original, { size: 1200 }, "image/jpeg", true)).toBe(false);
  });
});
