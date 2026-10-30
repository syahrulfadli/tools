import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Download, LoaderCircle, RotateCw, Trash2, Undo2 } from "lucide-react";
import { Bone } from "../../components/Skeleton";
import { ToolBar } from "../../components/tool/ToolBar";
import { PanelSection } from "../../components/tool/controls";
import { FailureList } from "../../components/tool/FileDropzone";
import { PdfDocumentCard, PdfWorkspaceState } from "../../components/tool/PdfDocument";
import { usePdfDocument, usePdfThumbnails, useSinglePdfInput } from "../../components/tool/usePdfDocument";
import { baseName, downloadBlob, formatBytes } from "../../lib/files";
import { rearrangePdf } from "../../lib/pdf-edit";
import { visualSize } from "../../lib/pdf-geometry";
import { parsePageRanges } from "../pdf-to-image/lib/pages";
import { deleteSources, initialPages, isUnchanged, movePage, outputPlan, reversePages, rotateAll, rotatePage, summarize, toggleDeleted, type PageItem } from "./lib/arrange";
import "../pdf-to-image/pdf-to-image.css";
import "./arrange-pdf.css";

type Status = { kind: "idle" } | { kind: "working" } | { kind: "done"; filename: string; bytes: number } | { kind: "error"; message: string };

export default function ArrangePdfTool() {
  const { doc, open, close } = usePdfDocument();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [deleteText, setDeleteText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const working = status.kind === "working";
  const ready = doc.phase === "ready" ? doc : null;
  const pageCount = ready?.pages.length ?? 0;
  const thumbs = usePdfThumbnails(ready?.pdf);
  const input = useSinglePdfInput(open, working);

  useEffect(() => {
    setPages(ready ? initialPages(ready.pages.length) : []);
    setDeleteText("");
    setDeleteError(null);
  }, [ready]);

  useEffect(() => {
    setStatus((current) => (current.kind === "working" ? current : { kind: "idle" }));
  }, [pages]);

  const summary = summarize(pages);
  // Posisi tiap halaman di PDF hasil (halaman terhapus tidak dihitung).
  let kept = 0;
  const positions = pages.map((item) => (item.deleted ? 0 : ++kept));
  const unchanged = isUnchanged(pages);
  const canSave = ready !== null && summary.kept > 0 && !unchanged && !working;

  async function save() {
    if (!ready || !canSave) return;
    setStatus({ kind: "working" });
    try {
      const blob = await rearrangePdf(ready.file, outputPlan(pages));
      const filename = `${baseName(ready.file.name)}-diatur.pdf`;
      downloadBlob(blob, filename);
      setStatus({ kind: "done", filename, bytes: blob.size });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    }
  }

  function applyDelete(event: FormEvent) {
    event.preventDefault();
    const result = parsePageRanges(deleteText, pageCount);
    if (!result.ok) return setDeleteError(result.error);
    setPages((current) => deleteSources(current, result.pages));
    setDeleteText("");
    setDeleteError(null);
  }

  // Seret-urutkan dengan drag and drop bawaan browser (desktop). Di layar sentuh, pakai tombol panah.
  const dragHandlers = (index: number) => ({
    draggable: !working,
    onDragStart: (event: DragEvent) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
      setDragFrom(index);
    },
    onDragOver: (event: DragEvent) => {
      if (dragFrom === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (dragOver !== index) setDragOver(index);
    },
    onDrop: (event: DragEvent) => {
      if (dragFrom === null) return;
      event.preventDefault();
      event.stopPropagation();
      setPages((current) => movePage(current, dragFrom, index));
      setDragFrom(null);
      setDragOver(null);
    },
    onDragEnd: () => {
      setDragFrom(null);
      setDragOver(null);
    },
  });

  return (
    <div className="tool" {...input.dropProps}>
      <title>Atur Halaman PDF · Productivity Tools</title>

      <ToolBar
        title="Atur Halaman PDF"
        pill={ready ? `${summary.kept.toLocaleString("id-ID")} dari ${pageCount.toLocaleString("id-ID")} halaman` : undefined}
        status={
          <>
            {status.kind === "working" && "Menyusun PDF…"}
            {status.kind === "done" && (
              <>
                Diunduh <span className="tool-bar__strong">{status.filename}</span>
                <span className="num"> · {formatBytes(status.bytes)}</span>
              </>
            )}
            {status.kind === "error" && <span className="tool-bar__error">{status.message}</span>}
          </>
        }
        actions={
          <button type="button" className="btn btn--primary" onClick={save} disabled={!canSave}>
            {working ? <LoaderCircle className="spin" size={14} strokeWidth={2} aria-hidden="true" /> : <Download size={14} strokeWidth={2} aria-hidden="true" />}
            Unduh PDF
          </button>
        }
      />

      <div className="tool-body tool-body--sidebar">
        <aside className="panel" aria-label="Pengaturan">
          <PanelSection title="Dokumen">
            <PdfDocumentCard doc={doc} disabled={working} onPick={input.picker.open} onClose={close} />
            <FailureList failures={input.failures} onDismiss={input.clearFailures} />
          </PanelSection>

          <PanelSection title="Hapus halaman">
            <form className="inline-form" onSubmit={applyDelete}>
              <label className="number-field number-field--wide">
                <span className="segmented-field__label">Nomor halaman asal</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="mis. 2, 5-7"
                  disabled={!ready}
                  value={deleteText}
                  onChange={(event) => {
                    setDeleteText(event.target.value);
                    setDeleteError(null);
                  }}
                  aria-invalid={deleteError ? true : undefined}
                  aria-describedby="arrange-delete-help"
                />
              </label>
              <button type="submit" className="btn" disabled={!ready || deleteText.trim() === ""}>
                Hapus
              </button>
            </form>
            <p id="arrange-delete-help" className={`field-note${deleteError ? " field-note--error" : ""}`} role={deleteError ? "alert" : undefined}>
              {deleteError ?? "Atau klik ikon tempat sampah di tiap halaman. Halaman terhapus bisa dikembalikan."}
            </p>
          </PanelSection>

          <PanelSection title="Semua halaman">
            <div className="button-row button-row--flush">
              <button type="button" className="btn" disabled={!ready || summary.kept === 0} onClick={() => setPages((current) => rotateAll(current, 90))}>
                <RotateCw size={14} strokeWidth={1.5} aria-hidden="true" />
                Putar semua
              </button>
              <button type="button" className="btn" disabled={!ready} onClick={() => setPages(reversePages)}>
                Balik urutan
              </button>
              <button type="button" className="btn btn--ghost" disabled={!ready || unchanged} onClick={() => setPages(initialPages(pageCount))}>
                <Undo2 size={14} strokeWidth={1.5} aria-hidden="true" />
                Kembalikan semula
              </button>
            </div>
            <p className="field-note">Seret halaman untuk memindahkannya, atau pakai panah di bawah tiap halaman.</p>
          </PanelSection>

          {ready && (
            <PanelSection title="Hasil">
              <dl className="summary num">
                <div>
                  <dt>Halaman hasil</dt>
                  <dd>{summary.kept.toLocaleString("id-ID")}</dd>
                </div>
                <div>
                  <dt>Dihapus</dt>
                  <dd>{summary.deleted.toLocaleString("id-ID")}</dd>
                </div>
                <div>
                  <dt>Diputar</dt>
                  <dd>{summary.rotated.toLocaleString("id-ID")}</dd>
                </div>
                <div>
                  <dt>Urutan</dt>
                  <dd>{summary.moved ? "Diubah" : "Asli"}</dd>
                </div>
              </dl>
              {summary.kept === 0 && <p className="field-note field-note--error">Semua halaman dihapus. Sisakan minimal satu.</p>}
            </PanelSection>
          )}
        </aside>

        <main className="panel workspace" aria-label="Halaman PDF">
          <PdfWorkspaceState
            doc={doc}
            onPick={input.picker.open}
            emptyTitle="Pilih file PDF"
            emptyHint="Atau seret ke sini. Urutkan, hapus, atau putar halamannya; file tidak diunggah ke mana pun."
          />

          {ready && (
            <>
              <header className="workspace__head">
                <h2>{pageCount.toLocaleString("id-ID")} halaman</h2>
                <p className="num" aria-live="polite">
                  {ready.pdf && Object.keys(thumbs).length < pageCount
                    ? `Menyiapkan pratinjau ${Object.keys(thumbs).length} dari ${pageCount}…`
                    : unchanged
                      ? "Belum ada perubahan"
                      : `${summary.kept.toLocaleString("id-ID")} halaman di PDF hasil`}
                </p>
              </header>
              <ol className="workspace__body arrange-grid">
                {pages.map((item, index) => {
                  const thumb = thumbs[item.source];
                  const box = ready.pages[item.source - 1];
                  const size = visualSize(box);
                  const label = `halaman ${item.source}`;
                  return (
                    <li
                      key={item.source}
                      className={`arrange-card${item.deleted ? " is-deleted" : ""}${dragFrom === index ? " is-dragging" : ""}${dragOver === index && dragFrom !== index ? " is-drop-target" : ""}`}
                      {...dragHandlers(index)}
                    >
                      <span className="arrange-card__well">
                        <span
                          className="arrange-card__sheet"
                          style={{
                            aspectRatio: `${size.width} / ${size.height}`,
                            [size.width >= size.height ? "width" : "height"]: "82%",
                            transform: `rotate(${item.rotate}deg)`,
                          }}
                        >
                          {thumb ? <img src={thumb.url} alt="" draggable={false} /> : <Bone w="100%" h="100%" r={0} />}
                        </span>
                        {item.deleted && <span className="arrange-card__badge">Dihapus</span>}
                      </span>
                      <span className="arrange-card__label num">
                        <span>
                          Hal. {item.source}
                          {item.rotate !== 0 && ` · ${item.rotate}°`}
                        </span>
                        {!item.deleted && <span className="arrange-card__position">ke-{positions[index].toLocaleString("id-ID")}</span>}
                      </span>
                      <span className="arrange-card__actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--icon"
                          disabled={index === 0 || working}
                          onClick={() => setPages((current) => movePage(current, index, index - 1))}
                          aria-label={`Geser ${label} ke depan`}
                        >
                          <ArrowLeft size={16} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--icon"
                          disabled={index === pages.length - 1 || working}
                          onClick={() => setPages((current) => movePage(current, index, index + 1))}
                          aria-label={`Geser ${label} ke belakang`}
                        >
                          <ArrowRight size={16} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--icon"
                          disabled={item.deleted || working}
                          onClick={() => setPages((current) => rotatePage(current, index, 90))}
                          aria-label={`Putar ${label} 90° searah jarum jam`}
                        >
                          <RotateCw size={16} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--icon"
                          disabled={working}
                          onClick={() => setPages((current) => toggleDeleted(current, index))}
                          aria-label={item.deleted ? `Kembalikan ${label}` : `Hapus ${label}`}
                        >
                          {item.deleted ? <Undo2 size={16} strokeWidth={1.5} /> : <Trash2 size={16} strokeWidth={1.5} />}
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </main>
      </div>

      {input.picker.input}
      {input.overlay}
    </div>
  );
}
