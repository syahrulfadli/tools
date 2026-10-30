/**
 * Menyusun PDF baru dari halaman PDF lain (gabung dan pisah) dengan pdf-lib, di browser.
 * Halaman disalin apa adanya, jadi teks, gambar, dan tautan di dalam halaman tetap utuh.
 */
import { PDFDocument, degrees } from "pdf-lib";
import { normalizeRotation, type PageBox } from "./pdf-geometry";

/** Buka PDF untuk disalin halamannya. Pesan error sudah siap ditampilkan ke user. */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    if ((error as Error).name === "EncryptedPDFError") throw new Error("PDF ini dilindungi kata sandi. Buka proteksinya dulu, lalu coba lagi.");
    throw new Error("File ini bukan PDF yang valid atau rusak.");
  }
}

export async function readFile(file: File) {
  return new Uint8Array(await file.arrayBuffer());
}

export function toBlob(bytes: Uint8Array) {
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}

/** Gabung semua halaman `files` berurutan jadi satu PDF. File dibaca satu per satu agar hemat memori. */
export async function mergePdfs(files: File[], onProgress: (done: number, total: number) => void): Promise<Blob> {
  const out = await PDFDocument.create();
  for (const [i, file] of files.entries()) {
    onProgress(i, files.length);
    let source: PDFDocument;
    try {
      source = await loadPdf(await readFile(file));
    } catch (error) {
      throw new Error(`${file.name}: ${(error as Error).message}`);
    }
    const pages = await out.copyPages(source, source.getPageIndices());
    pages.forEach((page) => out.addPage(page));
  }
  onProgress(files.length, files.length);
  return toBlob(await out.save());
}

/** Satu PDF per kelompok halaman (nomor mulai 1, urutan dipertahankan). */
export async function extractParts(file: File, parts: number[][], onProgress: (done: number, total: number) => void): Promise<Blob[]> {
  const source = await loadPdf(await readFile(file));
  const blobs: Blob[] = [];
  for (const [i, pages] of parts.entries()) {
    onProgress(i, parts.length);
    const out = await PDFDocument.create();
    const copied = await out.copyPages(
      source,
      pages.map((page) => page - 1),
    );
    copied.forEach((page) => out.addPage(page));
    blobs.push(toBlob(await out.save()));
  }
  onProgress(parts.length, parts.length);
  return blobs;
}

/** CropBox dan rotasi tiap halaman, untuk pratinjau dan penempatan teks/gambar. */
export function pageBoxes(doc: PDFDocument): PageBox[] {
  return doc.getPages().map((page) => {
    const { x, y, width, height } = page.getCropBox();
    return { x, y, width, height, rotation: normalizeRotation(page.getRotation().angle) };
  });
}

/**
 * PDF baru dengan halaman dalam urutan `plan` (nomor halaman asal mulai 1). `rotate` ditambahkan
 * ke rotasi halaman asal, searah jarum jam. Halaman yang tidak disebut ikut terbuang.
 */
export async function rearrangePdf(file: File, plan: { page: number; rotate: number }[]): Promise<Blob> {
  const source = await loadPdf(await readFile(file));
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    source,
    plan.map((item) => item.page - 1),
  );
  copied.forEach((page, i) => {
    if (plan[i].rotate) page.setRotation(degrees(normalizeRotation(page.getRotation().angle + plan[i].rotate)));
    out.addPage(page);
  });
  return toBlob(await out.save());
}
