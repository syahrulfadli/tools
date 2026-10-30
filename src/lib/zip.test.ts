import { describe, expect, it } from "vitest";
import { crc32, createZip } from "./zip";
import { baseName, uniqueNamer } from "./files";

describe("crc32", () => {
  it("cocok dengan nilai standar", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
});

describe("createZip", () => {
  it("menulis header lokal, direktori pusat, dan penutup yang konsisten", async () => {
    const zip = await createZip([
      { name: "a.txt", data: new TextEncoder().encode("halo") },
      { name: "hal-é.txt", data: new Blob(["dunia!"]) },
    ]);
    const bytes = new Uint8Array(await zip.arrayBuffer());
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    const end = bytes.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    const centralOffset = view.getUint32(end + 16, true);
    expect(view.getUint32(centralOffset, true)).toBe(0x02014b50);
    expect(centralOffset + view.getUint32(end + 12, true)).toBe(end);
  });
});

describe("nama file", () => {
  it("membuang ekstensi terakhir saja", () => {
    expect(baseName("laporan.final.pdf")).toBe("laporan.final");
    expect(baseName(".env")).toBe(".env");
  });

  it("memberi nomor pada nama yang kembar", () => {
    const name = uniqueNamer();
    expect([name("a.jpg"), name("A.jpg"), name("b.jpg"), name("a.jpg")]).toEqual(["a.jpg", "A (2).jpg", "b.jpg", "a (3).jpg"]);
  });
});
