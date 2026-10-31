import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { usePageImage } from "../../../components/tool/usePdfDocument";
import type { PDFDocumentProxy } from "../../pdf-to-image/lib/pdf";

interface Props {
  pdf: PDFDocumentProxy | null;
  page: number;
  count: number;
  /** Gambar kecil yang sudah ada, ditampilkan selama versi besar dirender. */
  fallback?: string;
  onNavigate: (page: number) => void;
  onClose: () => void;
  /** Isi halaman; menerima gambar halaman terbaik yang tersedia. */
  children: (src: string | undefined) => ReactNode;
}

/**
 * Pratinjau satu halaman berukuran besar dalam <dialog> modal (Esc dan klik di luar menutup,
 * panah kiri/kanan berpindah halaman). Halaman dirender ulang dengan pdf.js selebar layar.
 */
export function PageZoom({ pdf, page, count, fallback, onNavigate, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [width] = useState(() => Math.min(2000, Math.round(Math.min(window.innerWidth, 1040) * (window.devicePixelRatio || 1))));
  const image = usePageImage(pdf, page, width);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const go = (next: number) => {
    if (next >= 1 && next <= count) onNavigate(next);
  };

  return (
    <dialog
      ref={ref}
      className="page-zoom"
      aria-label={`Pratinjau halaman ${page}`}
      onClose={onClose}
      onClick={(event) => {
        // Klik di backdrop: target-nya elemen dialog itu sendiri.
        if (event.target === event.currentTarget) ref.current?.close();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") go(page - 1);
        if (event.key === "ArrowRight") go(page + 1);
      }}
    >
      <header className="page-zoom__bar">
        <p className="num">
          Halaman {page.toLocaleString("id-ID")} dari {count.toLocaleString("id-ID")}
        </p>
        <div className="page-zoom__actions">
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Halaman sebelumnya">
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => go(page + 1)} disabled={page >= count} aria-label="Halaman berikutnya">
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => ref.current?.close()} aria-label="Tutup pratinjau" autoFocus>
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      </header>
      <div className="page-zoom__body">{children(image?.url ?? fallback)}</div>
    </dialog>
  );
}
