/**
 * Bahan bersama untuk tool yang mengolah satu PDF (Atur Halaman, Nomor & Watermark, Tanda Tangan):
 * membuka PDF dan membuat thumbnail halaman. pdf-lib memutuskan apakah PDF bisa diolah (menolak
 * yang terenkripsi atau rusak) dan memberi ukuran tiap halaman; pdf.js hanya untuk pratinjau, jadi
 * bila pdf.js gagal tool tetap bisa jalan tanpa gambar halaman.
 *
 * Hanya diimpor dari komponen tool, sehingga pdf-lib dan pdf.js tetap di chunk tool.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { loadPdf, pageBoxes, readFile } from "../../lib/pdf-edit";
import type { PageBox } from "../../lib/pdf-geometry";
import { isPdf } from "../../tools/compress-pdf/lib/compress";
import { openPdf, pageThumbnail, type PDFDocumentProxy } from "../../tools/pdf-to-image/lib/pdf";
import type { FileFailure } from "./FileDropzone";
import { useFilePicker, usePageFileDrop, usePasteFiles } from "./fileInput";

export type PdfDocState =
  | { phase: "empty" }
  | { phase: "opening"; file: File }
  | { phase: "error"; file: File; message: string }
  | { phase: "ready"; file: File; pdf: PDFDocumentProxy | null; pages: PageBox[] };

export interface Thumb {
  url: string;
  width: number;
  height: number;
}

export function usePdfDocument() {
  const [doc, setDoc] = useState<PdfDocState>({ phase: "empty" });

  // Dokumen pdf.js ditutup saat diganti atau tool ditutup.
  const openDoc = useRef<PDFDocumentProxy | null>(null);
  const destroy = useCallback(() => {
    void openDoc.current?.destroy();
    openDoc.current = null;
  }, []);
  useEffect(() => destroy, [destroy]);

  const token = useRef(0);
  const open = useCallback(
    async (file: File) => {
      const current = ++token.current;
      destroy();
      setDoc({ phase: "opening", file });
      try {
        const pages = pageBoxes(await loadPdf(await readFile(file)));
        if (pages.length === 0) throw new Error("PDF ini tidak punya halaman.");
        let pdf: PDFDocumentProxy | null = null;
        try {
          pdf = await openPdf(file);
        } catch {
          pdf = null;
        }
        if (current !== token.current) return void pdf?.destroy();
        openDoc.current = pdf;
        setDoc({ phase: "ready", file, pdf, pages });
      } catch (error) {
        if (current === token.current) setDoc({ phase: "error", file, message: (error as Error).message });
      }
    },
    [destroy],
  );

  const close = useCallback(() => {
    token.current++;
    destroy();
    setDoc({ phase: "empty" });
  }, [destroy]);

  return { doc, open, close };
}

/**
 * Input satu PDF: pemilih file, seret ke halaman, dan tempel. File selain PDF pertama ditolak
 * dengan alasannya. Saat `busy`, PDF baru diabaikan.
 */
export function useSinglePdfInput(open: (file: File) => void, busy: boolean) {
  const [failures, setFailures] = useState<FileFailure[]>([]);
  const addFiles = useCallback(
    (files: File[]) => {
      const pdf = files.find(isPdf);
      setFailures(files.filter((file) => file !== pdf).map((file) => ({ name: file.name, reason: isPdf(file) ? "dilewati: satu PDF sekaligus." : "bukan file PDF." })));
      if (pdf && !busy) open(pdf);
    },
    [open, busy],
  );
  const picker = useFilePicker("application/pdf,.pdf", false, addFiles);
  const { dropProps, overlay } = usePageFileDrop(addFiles, "Lepaskan untuk membuka PDF");
  usePasteFiles(addFiles);
  return { picker, dropProps, overlay, failures, clearFailures: () => setFailures([]) };
}

/** Thumbnail semua halaman, dibuat berurutan (hemat memori). URL dilepas saat PDF berganti. */
export function usePdfThumbnails(pdf: PDFDocumentProxy | null | undefined, width = 240) {
  const [thumbs, setThumbs] = useState<Record<number, Thumb>>({});
  useEffect(() => {
    setThumbs({});
    if (!pdf) return;
    let stop = false;
    const urls: string[] = [];
    (async () => {
      for (let page = 1; page <= pdf.numPages && !stop; page++) {
        try {
          const thumb = await pageThumbnail(pdf, page, width);
          if (stop) return URL.revokeObjectURL(thumb.url);
          urls.push(thumb.url);
          setThumbs((current) => ({ ...current, [page]: thumb }));
        } catch {
          // Halaman tanpa pratinjau tetap bisa diolah.
        }
      }
    })();
    return () => {
      stop = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pdf, width]);
  return thumbs;
}

/** Gambar satu halaman berukuran lebih besar (mis. untuk menempatkan tanda tangan). */
export function usePageImage(pdf: PDFDocumentProxy | null | undefined, page: number, width: number) {
  const [image, setImage] = useState<Thumb | null>(null);
  useEffect(() => {
    setImage(null);
    if (!pdf || page < 1 || page > pdf.numPages) return;
    let stop = false;
    let url: string | null = null;
    pageThumbnail(pdf, page, width).then(
      (thumb) => {
        if (stop) return URL.revokeObjectURL(thumb.url);
        url = thumb.url;
        setImage(thumb);
      },
      () => {},
    );
    return () => {
      stop = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [pdf, page, width]);
  return image;
}
