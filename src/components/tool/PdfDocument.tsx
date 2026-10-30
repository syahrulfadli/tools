import { FilePlus2, FileText } from "lucide-react";
import { Bone } from "../Skeleton";
import { formatBytes } from "../../lib/files";
import { FileDropzone } from "./FileDropzone";
import type { PdfDocState } from "./usePdfDocument";

/** Isi seksi "Dokumen" di panel: tombol pilih PDF, atau kartu PDF yang terbuka. */
export function PdfDocumentCard({ doc, disabled, onPick, onClose }: { doc: PdfDocState; disabled?: boolean; onPick: () => void; onClose: () => void }) {
  if (doc.phase === "empty")
    return (
      <FileDropzone
        icon={<FilePlus2 size={20} strokeWidth={1.5} aria-hidden="true" />}
        title="Pilih PDF"
        hint="Satu file PDF. Bisa juga diseret ke halaman ini. PDF berkata sandi belum didukung."
        onClick={onPick}
      />
    );
  const pages = doc.phase === "ready" ? doc.pages.length : 0;
  return (
    <div className="doc-card">
      <FileText size={20} strokeWidth={1.5} aria-hidden="true" />
      <p>
        <span className="doc-card__name" title={doc.file.name}>
          {doc.file.name}
        </span>
        <span className="num">
          {formatBytes(doc.file.size)} · {pages ? `${pages.toLocaleString("id-ID")} halaman` : doc.phase === "opening" ? "Membuka…" : "Belum terbuka"}
        </span>
      </p>
      <div className="button-row">
        <button type="button" className="btn" onClick={onPick} disabled={disabled}>
          Ganti PDF
        </button>
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={disabled}>
          Tutup
        </button>
      </div>
    </div>
  );
}

/**
 * Area kerja sebelum PDF siap: tombol besar saat kosong, kisi balok saat membuka, pesan saat gagal.
 * Mengembalikan null saat PDF sudah siap.
 */
export function PdfWorkspaceState({ doc, emptyTitle, emptyHint, onPick }: { doc: PdfDocState; emptyTitle: string; emptyHint: string; onPick: () => void }) {
  if (doc.phase === "empty")
    return (
      <button type="button" className="workspace__empty" onClick={onPick}>
        <FilePlus2 size={32} strokeWidth={1.5} aria-hidden="true" />
        <strong>{emptyTitle}</strong>
        <span>{emptyHint}</span>
      </button>
    );
  if (doc.phase === "opening")
    return (
      <>
        <header className="workspace__head">
          <h2>{doc.file.name}</h2>
          <p aria-live="polite">Membuka PDF…</p>
        </header>
        <div className="workspace__body page-grid" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="page">
              <Bone h="auto" r={4} style={{ aspectRatio: "1 / 1.414" }} />
              <Bone w={48} h={12} style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>
      </>
    );
  if (doc.phase === "error")
    return (
      <div className="workspace__empty" role="alert">
        <FileText size={32} strokeWidth={1.5} aria-hidden="true" />
        <strong>{doc.message}</strong>
        <span className="num">{doc.file.name}</span>
        <button type="button" className="btn" onClick={onPick}>
          Pilih PDF lain
        </button>
      </div>
    );
  return null;
}
