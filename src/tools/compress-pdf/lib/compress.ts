/** Kompres satu PDF di browser dengan salah satu dari dua mode (lihat docs/README.md). */
import { buildPdf, type PdfPage } from "../../image-to-pdf/lib/pdf-writer";
import { PdfPasswordError, openPdf, pageSizePt, pageToImage } from "../../pdf-to-image/lib/pdf";
import { canvasEncoder } from "./images";
import { LEVELS, type Level, type Mode } from "./levels";
import { EncryptedPdfError, recompressImages } from "./recompress";

export interface PdfResult {
  blob: Blob;
  /** True bila hasil tidak lebih kecil, jadi file asli dipakai apa adanya. */
  kept: boolean;
  /** Keterangan singkat untuk baris daftar. */
  detail: string;
}

export function isPdf(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/** Nama file hasil: "laporan.pdf" → "laporan-kompres.pdf". */
export function outputName(name: string) {
  return `${name.replace(/\.pdf$/i, "")}-kompres.pdf`;
}

export async function compressPdf(
  file: File,
  mode: Mode,
  level: Level,
  onProgress: (done: number, total: number) => void,
  isCancelled: () => boolean,
): Promise<PdfResult> {
  const preset = LEVELS[level];
  let blob: Blob;
  let detail: string;

  if (mode === "images") {
    const { bytes, candidates, replaced } = await recompressImages(
      new Uint8Array(await file.arrayBuffer()),
      canvasEncoder(preset.maxEdge, preset.quality),
      onProgress,
    );
    blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
    detail =
      candidates === 0
        ? "tidak ada gambar JPEG untuk dikompres"
        : `${replaced.toLocaleString("id-ID")} dari ${candidates.toLocaleString("id-ID")} gambar dikompres`;
  } else {
    let doc;
    try {
      doc = await openPdf(file);
    } catch (error) {
      if (error instanceof PdfPasswordError) throw new EncryptedPdfError();
      throw error;
    }
    try {
      const pages: PdfPage[] = [];
      for (let n = 1; n <= doc.numPages; n++) {
        if (isCancelled()) throw new Error("dibatalkan");
        onProgress(n - 1, doc.numPages);
        const size = await pageSizePt(doc, n);
        const image = await pageToImage(doc, n, preset.dpi, "jpeg", preset.jpeg);
        pages.push({
          width: size.width,
          height: size.height,
          image: {
            width: image.width,
            height: image.height,
            filter: "DCTDecode",
            colorSpace: "DeviceRGB",
            data: new Uint8Array(await image.blob.arrayBuffer()),
          },
          matrix: [size.width, 0, 0, size.height, 0, 0],
        });
      }
      onProgress(doc.numPages, doc.numPages);
      blob = buildPdf(pages, { title: file.name.replace(/\.pdf$/i, "") });
      detail = `${doc.numPages.toLocaleString("id-ID")} halaman jadi gambar`;
    } finally {
      void doc.destroy();
    }
  }

  if (blob.size >= file.size) return { blob: file, kept: true, detail: "sudah optimal, dipakai apa adanya" };
  return { blob, kept: false, detail };
}
