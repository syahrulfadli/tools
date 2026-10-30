import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Check, Download, FilePlus2, FileText, LoaderCircle } from "lucide-react";
import { Bone } from "../../components/Skeleton";
import { ToolBar } from "../../components/tool/ToolBar";
import { PanelSection, Segmented } from "../../components/tool/controls";
import { FailureList, FileDropzone, type FileFailure } from "../../components/tool/FileDropzone";
import { useFilePicker, usePageFileDrop, usePasteFiles } from "../../components/tool/fileInput";
import { baseName, downloadBlob, formatBytes, uniqueNamer } from "../../lib/files";
import { extractParts, loadPdf, readFile } from "../../lib/pdf-edit";
import { createZip } from "../../lib/zip";
import { isPdf } from "../compress-pdf/lib/compress";
import { formatPageRanges, parsePageRanges } from "../pdf-to-image/lib/pages";
import { openPdf, pageThumbnail, type PDFDocumentProxy } from "../pdf-to-image/lib/pdf";
import { partName, planEvery, planRanges, type PlanResult } from "./lib/plan";
import "../pdf-to-image/pdf-to-image.css";
import "./split-pdf.css";

type Mode = "select" | "ranges" | "every";

const MODES: { value: Mode; label: string }[] = [
  { value: "select", label: "Pilih" },
  { value: "ranges", label: "Rentang" },
  { value: "every", label: "Per n" },
];

const MODE_NOTES: Record<Mode, string> = {
  select: "Klik halaman yang mau diambil. Hasilnya satu PDF berisi halaman terpilih. Shift+klik memilih satu rentang.",
  ranges: "Tiap rentang yang dipisah koma jadi satu PDF sendiri, mis. “1-3, 4-6, 9” menghasilkan tiga PDF.",
  every: "Bagi PDF menjadi potongan berukuran sama. Sisa halaman di akhir jadi PDF terakhir.",
};

type Doc =
  | { phase: "empty" }
  | { phase: "opening"; file: File }
  | { phase: "error"; file: File; message: string }
  | { phase: "ready"; file: File; pdf: PDFDocumentProxy | null; pageCount: number; aspect: number };

type Status =
  | { kind: "idle" }
  | { kind: "working"; done: number; total: number }
  | { kind: "done"; filename: string; bytes: number; count: number }
  | { kind: "error"; message: string };

interface Thumb {
  url: string;
  width: number;
  height: number;
}

export default function SplitPdfTool() {
  const [doc, setDoc] = useState<Doc>({ phase: "empty" });
  const [thumbs, setThumbs] = useState<Record<number, Thumb>>({});
  const [mode, setMode] = useState<Mode>("select");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectDraft, setSelectDraft] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [rangesText, setRangesText] = useState("");
  const [everyText, setEveryText] = useState("1");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [failures, setFailures] = useState<FileFailure[]>([]);
  const lastClicked = useRef<number | null>(null);

  const ready = doc.phase === "ready" ? doc : null;
  const pageCount = ready?.pageCount ?? 0;
  const working = status.kind === "working";

  // Dokumen pdf.js (untuk thumbnail) ditutup saat diganti atau tool ditutup.
  const openDoc = useRef<PDFDocumentProxy | null>(null);
  const closeDoc = useCallback(() => {
    void openDoc.current?.destroy();
    openDoc.current = null;
  }, []);
  useEffect(() => closeDoc, [closeDoc]);

  const openToken = useRef(0);
  const open = useCallback(
    async (file: File) => {
      const token = ++openToken.current;
      closeDoc();
      setDoc({ phase: "opening", file });
      setStatus({ kind: "idle" });
      try {
        // pdf-lib memutuskan apakah PDF bisa dipisah (menolak yang terenkripsi); pdf.js hanya untuk pratinjau.
        const count = (await loadPdf(await readFile(file))).getPageCount();
        if (count === 0) throw new Error("PDF ini tidak punya halaman.");
        let pdf: PDFDocumentProxy | null = null;
        let aspect = 1 / 1.414;
        try {
          pdf = await openPdf(file);
          const first = (await pdf.getPage(1)).getViewport({ scale: 1 });
          aspect = first.width / first.height;
        } catch {
          void pdf?.destroy();
          pdf = null;
        }
        if (token !== openToken.current) return void pdf?.destroy();
        openDoc.current = pdf;
        setDoc({ phase: "ready", file, pdf, pageCount: count, aspect });
        setSelected(new Set(Array.from({ length: count }, (_, i) => i + 1)));
        setSelectDraft(null);
        setSelectError(null);
        setRangesText("");
      } catch (error) {
        if (token === openToken.current) setDoc({ phase: "error", file, message: (error as Error).message });
      }
    },
    [closeDoc],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const pdf = files.find(isPdf);
      setFailures(
        files.filter((file) => file !== pdf).map((file) => ({ name: file.name, reason: isPdf(file) ? "dilewati: satu PDF sekaligus." : "bukan file PDF." })),
      );
      if (pdf && !working) void open(pdf);
    },
    [working, open],
  );

  const picker = useFilePicker("application/pdf,.pdf", false, addFiles);
  const { dropProps, overlay } = usePageFileDrop(addFiles, "Lepaskan untuk membuka PDF");
  usePasteFiles(addFiles);

  const pdf = ready?.pdf;
  useEffect(() => {
    if (!pdf) return;
    let stop = false;
    const urls: string[] = [];
    setThumbs({});
    (async () => {
      for (let page = 1; page <= pdf.numPages && !stop; page++) {
        try {
          const thumb = await pageThumbnail(pdf, page);
          if (stop) {
            URL.revokeObjectURL(thumb.url);
            return;
          }
          urls.push(thumb.url);
          setThumbs((current) => ({ ...current, [page]: thumb }));
        } catch {
          // Halaman tanpa pratinjau tetap ikut dipisah.
        }
      }
    })();
    return () => {
      stop = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pdf]);

  // Rencana hasil mengikuti mode aktif; `plan.ok === false` menahan tombol unduh.
  const plan: PlanResult = useMemo(() => {
    if (!ready) return { ok: false, error: "" };
    if (mode === "select") return selected.size > 0 ? { ok: true, parts: [[...selected].sort((a, b) => a - b)] } : { ok: false, error: "Pilih minimal satu halaman." };
    if (mode === "ranges") return planRanges(rangesText, pageCount);
    return planEvery(Number(everyText), pageCount);
  }, [ready, mode, selected, rangesText, everyText, pageCount]);

  useEffect(() => {
    setStatus((current) => (current.kind === "working" ? current : { kind: "idle" }));
  }, [plan]);

  // Mode Rentang/Per n: tiap halaman diberi nomor PDF hasilnya (yang pertama bila tumpang tindih).
  const partOf = useMemo(() => {
    const map = new Map<number, number>();
    if (mode !== "select" && plan.ok) plan.parts.forEach((pages, i) => pages.forEach((page) => map.has(page) || map.set(page, i + 1)));
    return map;
  }, [mode, plan]);

  function togglePage(page: number, event: MouseEvent) {
    setSelected((current) => {
      const next = new Set(current);
      if (event.shiftKey && lastClicked.current !== null) {
        const [lo, hi] = [Math.min(lastClicked.current, page), Math.max(lastClicked.current, page)];
        const on = !current.has(page);
        for (let p = lo; p <= hi; p++) on ? next.add(p) : next.delete(p);
      } else if (next.has(page)) next.delete(page);
      else next.add(page);
      return next;
    });
    lastClicked.current = page;
  }

  function applySelectDraft(event?: FormEvent) {
    event?.preventDefault();
    if (selectDraft === null) return;
    const result = parsePageRanges(selectDraft, pageCount);
    if (result.ok) {
      setSelected(new Set(result.pages));
      setSelectDraft(null);
      setSelectError(null);
    } else setSelectError(result.error);
  }

  async function split() {
    if (!ready || !plan.ok) return;
    const base = baseName(ready.file.name);
    setStatus({ kind: "working", done: 0, total: plan.parts.length });
    try {
      const blobs = await extractParts(ready.file, plan.parts, (done, total) => setStatus({ kind: "working", done, total }));
      let out: { name: string; blob: Blob };
      if (blobs.length === 1) out = { name: partName(base, plan.parts[0]), blob: blobs[0] };
      else {
        const name = uniqueNamer();
        const zip = await createZip(blobs.map((blob, i) => ({ name: name(partName(base, plan.parts[i])), data: blob })));
        out = { name: `${base}-pisah.zip`, blob: zip };
      }
      downloadBlob(out.blob, out.name);
      setStatus({ kind: "done", filename: out.name, bytes: out.blob.size, count: blobs.length });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    }
  }

  function reset() {
    closeDoc();
    setDoc({ phase: "empty" });
    setSelected(new Set());
    setFailures([]);
    setStatus({ kind: "idle" });
  }

  const thumbsDone = Object.keys(thumbs).length;
  const resultCount = plan.ok ? plan.parts.length : 0;
  const primaryLabel = resultCount > 1 ? `Unduh ${resultCount.toLocaleString("id-ID")} PDF (ZIP)` : "Unduh PDF";
  const planError = ready && !plan.ok && (mode !== "ranges" || rangesText.trim() !== "") ? plan.error : null;

  return (
    <div className="tool" {...dropProps}>
      <title>Pisah PDF · Productivity Tools</title>

      <ToolBar
        title="Pisah PDF"
        pill={ready ? `${pageCount.toLocaleString("id-ID")} halaman` : undefined}
        status={
          <>
            {status.kind === "working" && `Memisah PDF ${Math.min(status.done + 1, status.total)} dari ${status.total}…`}
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
          <button type="button" className="btn btn--primary" onClick={split} disabled={!ready || !plan.ok || working}>
            {working ? <LoaderCircle className="spin" size={14} strokeWidth={2} aria-hidden="true" /> : <Download size={14} strokeWidth={2} aria-hidden="true" />}
            {primaryLabel}
          </button>
        }
      />

      <div className="tool-body tool-body--sidebar">
        <aside className="panel" aria-label="Pengaturan">
          <PanelSection title="Dokumen" aside={doc.phase !== "empty" ? formatBytes(doc.file.size) : undefined}>
            {doc.phase === "empty" ? (
              <FileDropzone
                icon={<FilePlus2 size={20} strokeWidth={1.5} aria-hidden="true" />}
                title="Pilih PDF"
                hint="Satu file PDF. Bisa juga diseret ke halaman ini. PDF berkata sandi belum didukung."
                onClick={picker.open}
              />
            ) : (
              <div className="doc-card">
                <FileText size={20} strokeWidth={1.5} aria-hidden="true" />
                <p>
                  <span className="doc-card__name" title={doc.file.name}>
                    {doc.file.name}
                  </span>
                  <span className="num">{ready ? `${pageCount.toLocaleString("id-ID")} halaman` : "Belum terbuka"}</span>
                </p>
                <div className="button-row">
                  <button type="button" className="btn" onClick={picker.open} disabled={working}>
                    Ganti PDF
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={reset} disabled={working}>
                    Tutup
                  </button>
                </div>
              </div>
            )}
            <FailureList failures={failures} onDismiss={() => setFailures([])} />
          </PanelSection>

          <PanelSection title="Cara memisah">
            <Segmented label="Cara memisah" options={MODES} value={mode} onChange={setMode} />
            <p className="field-note">{MODE_NOTES[mode]}</p>
          </PanelSection>

          <PanelSection title="Halaman" aside={ready && plan.ok ? `${resultCount.toLocaleString("id-ID")} PDF hasil` : undefined}>
            {mode === "select" && (
              <>
                <form onSubmit={applySelectDraft}>
                  <label className="number-field number-field--wide">
                    <span className="segmented-field__label">Nomor halaman</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="mis. 1-3, 8"
                      disabled={!ready}
                      value={selectDraft ?? formatPageRanges(selected)}
                      onChange={(event) => {
                        setSelectDraft(event.target.value);
                        setSelectError(null);
                      }}
                      onBlur={() => applySelectDraft()}
                      aria-invalid={selectError ? true : undefined}
                      aria-describedby="split-help"
                    />
                  </label>
                </form>
                <p id="split-help" className={`field-note${selectError ? " field-note--error" : ""}`} role={selectError ? "alert" : undefined}>
                  {selectError ?? `${selected.size} dari ${pageCount} halaman dipilih.`}
                </p>
                <div className="button-row">
                  <button type="button" className="btn" disabled={!ready || selected.size === pageCount} onClick={() => setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)))}>
                    Pilih semua
                  </button>
                  <button type="button" className="btn" disabled={!ready || selected.size === 0} onClick={() => setSelected(new Set())}>
                    Kosongkan
                  </button>
                </div>
              </>
            )}
            {mode === "ranges" && (
              <>
                <label className="number-field number-field--wide">
                  <span className="segmented-field__label">Rentang per PDF</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="mis. 1-3, 4-6, 9"
                    disabled={!ready}
                    value={rangesText}
                    onChange={(event) => setRangesText(event.target.value)}
                    aria-invalid={planError ? true : undefined}
                    aria-describedby="split-help"
                  />
                </label>
                <p id="split-help" className={`field-note${planError ? " field-note--error" : ""}`} role={planError ? "alert" : undefined}>
                  {planError ?? (plan.ok ? `Menghasilkan ${resultCount} PDF.` : "Pisahkan rentang dengan koma.")}
                </p>
              </>
            )}
            {mode === "every" && (
              <>
                <label className="number-field number-field--wide">
                  <span className="segmented-field__label">Halaman per PDF</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={Math.max(pageCount, 1)}
                    disabled={!ready}
                    value={everyText}
                    onChange={(event) => setEveryText(event.target.value)}
                    aria-invalid={planError ? true : undefined}
                    aria-describedby="split-help"
                  />
                </label>
                <p id="split-help" className={`field-note${planError ? " field-note--error" : ""}`} role={planError ? "alert" : undefined}>
                  {planError ?? (plan.ok ? `Menghasilkan ${resultCount} PDF.` : "")}
                </p>
              </>
            )}
          </PanelSection>
        </aside>

        <main className="panel workspace" aria-label="Halaman PDF">
          {doc.phase === "empty" && (
            <button type="button" className="workspace__empty" onClick={picker.open}>
              <FilePlus2 size={32} strokeWidth={1.5} aria-hidden="true" />
              <strong>Pilih file PDF</strong>
              <span>Atau seret ke sini. Ambil beberapa halaman atau bagi jadi beberapa PDF; file tidak diunggah ke mana pun.</span>
            </button>
          )}

          {doc.phase === "opening" && (
            <>
              <WorkspaceHead title={doc.file.name} note="Membuka PDF…" />
              <div className="workspace__body page-grid" aria-hidden="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="page">
                    <Bone h="auto" r={4} style={{ aspectRatio: "1 / 1.414" }} />
                    <Bone w={48} h={12} style={{ marginTop: 8 }} />
                  </div>
                ))}
              </div>
            </>
          )}

          {doc.phase === "error" && (
            <div className="workspace__empty" role="alert">
              <FileText size={32} strokeWidth={1.5} aria-hidden="true" />
              <strong>{doc.message}</strong>
              <span className="num">{doc.file.name}</span>
              <button type="button" className="btn" onClick={picker.open}>
                Pilih PDF lain
              </button>
            </div>
          )}

          {ready && (
            <>
              <WorkspaceHead
                title={`${pageCount.toLocaleString("id-ID")} halaman`}
                note={
                  ready.pdf && thumbsDone < pageCount
                    ? `Menyiapkan pratinjau ${thumbsDone} dari ${pageCount}…`
                    : plan.ok
                      ? resultCount === 1
                        ? `${plan.parts[0].length} halaman jadi satu PDF`
                        : `Jadi ${resultCount.toLocaleString("id-ID")} PDF`
                      : "Atur halaman di panel kiri"
                }
              />
              <ul className="workspace__body page-grid">
                {Array.from({ length: pageCount }, (_, i) => {
                  const page = i + 1;
                  const thumb = thumbs[page];
                  const on = mode === "select" && selected.has(page);
                  const part = partOf.get(page);
                  const sheet = (
                    <span className="page__sheet" style={{ aspectRatio: thumb ? `${thumb.width} / ${thumb.height}` : String(ready.aspect) }}>
                      {thumb ? <img src={thumb.url} alt="" /> : <Bone w="100%" h="100%" r={0} />}
                      {mode === "select" && (
                        <span className="page__check" aria-hidden="true">
                          {on && <Check size={14} strokeWidth={2.5} />}
                        </span>
                      )}
                    </span>
                  );
                  return (
                    <li key={page}>
                      {mode === "select" ? (
                        <button type="button" className={`page${on ? " is-selected" : ""}`} aria-pressed={on} aria-label={`Halaman ${page}`} onClick={(event) => togglePage(page, event)}>
                          {sheet}
                          <span className="page__label num">Hal. {page}</span>
                        </button>
                      ) : (
                        <div className={`page page--static${part ? " is-selected" : ""}`}>
                          {sheet}
                          <span className="page__label num">
                            Hal. {page}
                            {part ? ` · PDF ${part}` : " · dilewati"}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </main>
      </div>

      {picker.input}
      {overlay}
    </div>
  );
}

function WorkspaceHead({ title, note }: { title: string; note: string }) {
  return (
    <header className="workspace__head">
      <h2>{title}</h2>
      <p className="num" aria-live="polite">
        {note}
      </p>
    </header>
  );
}
