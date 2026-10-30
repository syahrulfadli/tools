/**
 * Pembungkus pdf.js. Semua parsing dan render terjadi di browser (Web Worker pdf.js);
 * file PDF tidak pernah dikirim ke server.
 */
import { GlobalWorkerOptions, PasswordResponses, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { canvasLimitFactor, canvasToBlob, releaseCanvas } from "../../../lib/canvas";

GlobalWorkerOptions.workerSrc = workerUrl;

export type { PDFDocumentProxy };

/** Satuan PDF: 72 poin per inci. */
const PDF_DPI = 72;

export class PdfPasswordError extends Error {
  constructor(readonly incorrect: boolean) {
    super(incorrect ? "Kata sandi salah." : "PDF ini dilindungi kata sandi.");
  }
}

/** Buka PDF dari file. Lempar `PdfPasswordError` bila butuh (atau salah) kata sandi. */
export async function openPdf(file: File, password?: string): Promise<PDFDocumentProxy> {
  // Data ditransfer ke worker, jadi baca ulang dari file setiap kali dibuka.
  const data = new Uint8Array(await file.arrayBuffer());
  const task = getDocument({
    data,
    password,
    cMapUrl: "/vendor/pdfjs/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/vendor/pdfjs/standard_fonts/",
    // Selalu pakai font standar bawaan pdf.js, bukan font sistem: hasil sama di semua perangkat
    // dan jarak huruf sesuai metrik PDF.
    useSystemFonts: false,
    isEvalSupported: false,
    enableXfa: false,
  });
  return new Promise((resolve, reject) => {
    // Tanpa updatePassword dipanggil, pdf.js menunggu selamanya: tolak dan hentikan worker-nya.
    task.onPassword = (_update: unknown, reason: number) => {
      reject(new PdfPasswordError(reason === PasswordResponses.INCORRECT_PASSWORD));
      void task.destroy();
    };
    task.promise.then(resolve, (error: { name?: string }) => {
      if (error?.name === "PasswordException") reject(new PdfPasswordError(Boolean(password)));
      else if (error?.name === "InvalidPDFException") reject(new Error("File ini bukan PDF yang valid atau rusak."));
      else reject(new Error("PDF tidak bisa dibuka."));
    });
  });
}

/** Ukuran halaman dalam piksel pada DPI tertentu, setelah dibatasi agar kanvas aman. */
export async function pageSize(doc: PDFDocumentProxy, pageNumber: number, dpi: number) {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: dpi / PDF_DPI });
  const factor = canvasLimitFactor(viewport.width, viewport.height);
  return {
    width: Math.floor(viewport.width * factor),
    height: Math.floor(viewport.height * factor),
    limited: factor < 1,
  };
}

async function renderToCanvas(doc: PDFDocumentProxy, pageNumber: number, scale: number) {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale });
  const viewport = page.getViewport({ scale: scale * canvasLimitFactor(base.width, base.height) });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung canvas 2D.");
  // Halaman diberi latar putih seperti kertas (JPEG tidak punya transparansi; PNG pun tampil sama).
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, background: "#ffffff" }).promise;
  page.cleanup();
  return canvas;
}

export type ImageFormat = "jpeg" | "png";

/** Render satu halaman jadi gambar. `quality` (0–1) hanya berlaku untuk JPEG. */
export async function pageToImage(doc: PDFDocumentProxy, pageNumber: number, dpi: number, format: ImageFormat, quality: number) {
  const canvas = await renderToCanvas(doc, pageNumber, dpi / PDF_DPI);
  try {
    const blob = await canvasToBlob(canvas, `image/${format}`, format === "jpeg" ? quality : undefined);
    return { blob, width: canvas.width, height: canvas.height };
  } finally {
    releaseCanvas(canvas);
  }
}

/** Thumbnail kecil (lebar ±`width` px) untuk kisi halaman. */
export async function pageThumbnail(doc: PDFDocumentProxy, pageNumber: number, width = 240) {
  const page = await doc.getPage(pageNumber);
  const scale = width / page.getViewport({ scale: 1 }).width;
  const canvas = await renderToCanvas(doc, pageNumber, scale);
  try {
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.8);
    return { url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height };
  } finally {
    releaseCanvas(canvas);
  }
}
