import { describe, expect, it } from "vitest";
import { containerKind, isDocx, rejectReason } from "./render";

const file = (name: string, type = "") => new File([], name, { type });

describe("containerKind", () => {
  it("membedakan .docx (ZIP) dari .doc lama atau .docx berkata sandi (OLE)", () => {
    expect(containerKind(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe("zip");
    expect(containerKind(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]))).toBe("ole");
    expect(containerKind(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe("unknown");
    expect(containerKind(new Uint8Array([]))).toBe("unknown");
  });
});

describe("isDocx / rejectReason", () => {
  it("menerima .docx dari nama atau tipe MIME", () => {
    expect(isDocx(file("Surat.DOCX"))).toBe(true);
    expect(isDocx(file("tanpa-ekstensi", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))).toBe(true);
    expect(isDocx(file("lama.doc"))).toBe(false);
  });

  it("menjelaskan cara mengubah format yang ditolak", () => {
    expect(rejectReason(file("lama.doc"))).toMatch(/Simpan Sebagai \.docx/);
    expect(rejectReason(file("catatan.odt"))).toMatch(/bukan \.docx/);
    expect(rejectReason(file("foto.jpg"))).toBe("bukan dokumen Word (.docx).");
  });
});
