import { PDFDocument, PDFName, PDFNumber, PDFRawStream, type PDFRef } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { outputName } from "./compress";
import { reducedSize } from "./images";
import { EncryptedPdfError, recompressImages, type ImageEncoder } from "./recompress";

/** PDF dengan satu gambar tiruan; isi bytes-nya tidak perlu JPEG sungguhan karena encoder disuntikkan. */
async function pdfWithImage(extra: Record<string, unknown> = {}, bytes = 40_000) {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  const data = new Uint8Array(bytes).fill(7);
  const ref: PDFRef = doc.context.register(
    doc.context.stream(data, {
      Type: "XObject",
      Subtype: "Image",
      Width: 1000,
      Height: 800,
      ColorSpace: "DeviceRGB",
      BitsPerComponent: 8,
      Filter: "DCTDecode",
      ...extra,
    }),
  );
  return { bytes: await doc.save(), ref };
}

async function imageStreams(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc.context
    .enumerateIndirectObjects()
    .map(([, object]) => object)
    .filter((object): object is PDFRawStream => object instanceof PDFRawStream && object.dict.get(PDFName.of("Subtype")) === PDFName.of("Image"));
}

const shrink: ImageEncoder = async (_jpeg, info) => ({ data: new Uint8Array(5_000).fill(1), width: info.width / 2, height: info.height / 2 });

describe("recompressImages", () => {
  it("mengganti gambar JPEG besar dengan hasil encoder", async () => {
    const { bytes } = await pdfWithImage();
    const result = await recompressImages(bytes, shrink);
    expect(result).toMatchObject({ candidates: 1, replaced: 1 });
    const [image] = await imageStreams(result.bytes);
    expect(image.getContentsSize()).toBe(5_000);
    expect((image.dict.get(PDFName.of("Width")) as PDFNumber).asNumber()).toBe(500);
    expect((image.dict.get(PDFName.of("Height")) as PDFNumber).asNumber()).toBe(400);
    expect(image.dict.get(PDFName.of("Filter"))).toBe(PDFName.of("DCTDecode"));
  });

  it("memberi encoder byte JPEG asli dan ukuran dari kamus gambar", async () => {
    const { bytes } = await pdfWithImage();
    const encode = vi.fn(shrink);
    await recompressImages(bytes, encode);
    expect(encode).toHaveBeenCalledTimes(1);
    expect(encode.mock.calls[0][0]).toHaveLength(40_000);
    expect(encode.mock.calls[0][1]).toEqual({ width: 1000, height: 800 });
  });

  it("tidak mengganti bila encoder tidak menghasilkan yang lebih kecil", async () => {
    const { bytes } = await pdfWithImage();
    expect(await recompressImages(bytes, async () => null)).toMatchObject({ candidates: 1, replaced: 0 });
    const barely: ImageEncoder = async () => ({ data: new Uint8Array(39_000), width: 1000, height: 800 });
    expect(await recompressImages(bytes, barely)).toMatchObject({ replaced: 0 });
  });

  it("melewati gambar kecil, bukan JPEG, CMYK, ber-Decode, dan ber-Mask", async () => {
    const encode = vi.fn(shrink);
    for (const [extra, size] of [
      [{}, 2_000],
      [{ Filter: "FlateDecode" }, 40_000],
      [{ ColorSpace: "DeviceCMYK" }, 40_000],
      [{ Decode: [1, 0, 1, 0, 1, 0] }, 40_000],
      [{ Mask: [0, 10, 0, 10, 0, 10] }, 40_000],
      [{ ImageMask: true }, 40_000],
    ] as const) {
      const { bytes } = await pdfWithImage(extra, size);
      expect(await recompressImages(bytes, encode)).toMatchObject({ candidates: 0, replaced: 0 });
    }
    expect(encode).not.toHaveBeenCalled();
  });

  it("menghasilkan PDF yang masih bisa dibuka dengan jumlah halaman sama", async () => {
    const { bytes } = await pdfWithImage();
    const { bytes: out } = await recompressImages(bytes, shrink);
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1);
  });

  it("menolak file yang bukan PDF", async () => {
    await expect(recompressImages(new TextEncoder().encode("bukan pdf"), shrink)).rejects.toThrow(/bukan PDF/);
  });

  it("memberi pesan khusus untuk PDF terenkripsi", () => {
    expect(new EncryptedPdfError().message).toMatch(/kata sandi/);
  });
});

describe("reducedSize", () => {
  it("memperkecil sisi terpanjang tanpa memperbesar", () => {
    expect(reducedSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(reducedSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

describe("outputName", () => {
  it("menambah -kompres sebelum .pdf", () => {
    expect(outputName("laporan.final.PDF")).toBe("laporan.final-kompres.pdf");
    expect(outputName("scan")).toBe("scan-kompres.pdf");
  });
});
