import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Copy, Download, FilePlus2, FileText, LoaderCircle, Lock, ScanText } from "lucide-react";
import { Bone } from "../../components/Skeleton";
import { ToolBar } from "../../components/tool/ToolBar";
import { PanelSection, Toggle } from "../../components/tool/controls";
import { FailureList, FileDropzone, type FileFailure } from "../../components/tool/FileDropzone";
import { useFilePicker, usePageFileDrop, usePasteFiles } from "../../components/tool/fileInput";
import { baseName, downloadBlob, formatBytes } from "../../lib/files";
import { isPdf } from "../compress-pdf/lib/compress";
import { formatPageRanges, parsePageRanges } from "../pdf-to-image/lib/pages";
import { openPdf, PdfPasswordError, type PDFDocumentProxy } from "../pdf-to-image/lib/pdf";
import { extractPageLines } from "./lib/extract";
import { formatDocument, textStats } from "./lib/text";
import "../pdf-to-image/pdf-to-image.css";
import "./pdf-to-text.css";

type Doc =
  | { phase: "empty" }
  | { phase: "opening"; file: File }
  | { phase: "password"; file: File; incorrect: boolean }
  | { phase: "error"; file: File; message: string }
  | { phase: "ready"; file: File; pdf: PDFDocumentProxy };

export default function PdfToTextTool() {
  const [doc, setDoc] = useState<Doc>({ phase: "empty" });
  const [password, setPassword] = useState("");
  const [pages, setPages] = useState<Map<number, string[]>>(new Map());
  const [selected, setSelected] = useState<number[]>([]);
  const [draft, setDraft] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [markers, setMarkers] = useState(true);
  const [unwrap, setUnwrap] = useState(false);
  const [failures, setFailures] = useState<FileFailure[]>([]);
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "copied" } | { kind: "saved"; filename: string; bytes: number } | { kind: "error"; message: string }>({
    kind: "idle",
  });

  const ready = doc.phase === "ready" ? doc : null;
  const pageCount = ready?.pdf.numPages ?? 0;

  const openDoc = useRef<PDFDocumentProxy | null>(null);
  const closeDoc = useCallback(() => {
    void openDoc.current?.destroy();
    openDoc.current = null;
  }, []);
  useEffect(() => closeDoc, [closeDoc]);

  const openToken = useRef(0);
  const open = useCallback(
    async (file: File, pass?: string) => {
      const token = ++openToken.current;
      closeDoc();
      setDoc({ phase: "opening", file });
      setStatus({ kind: "idle" });
      try {
        const pdf = await openPdf(file, pass);
        if (token !== openToken.current) return void pdf.destroy();
        openDoc.current = pdf;
        setDoc({ phase: "ready", file, pdf });
        setSelected(Array.from({ length: pdf.numPages }, (_, i) => i + 1));
        setDraft(null);
        setDraftError(null);
        setPassword("");
      } catch (error) {
        if (token !== openToken.current) return;
        if (error instanceof PdfPasswordError) setDoc({ phase: "password", file, incorrect: error.incorrect });
        else setDoc({ phase: "error", file, message: (error as Error).message });
      }
    },
    [closeDoc],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const pdf = files.find(isPdf);
      setFailures(files.filter((file) => file !== pdf).map((file) => ({ name: file.name, reason: isPdf(file) ? "dilewati: satu PDF sekaligus." : "bukan file PDF." })));
      if (pdf) void open(pdf);
    },
    [open],
  );

  const picker = useFilePicker("application/pdf,.pdf", false, addFiles);
  const { dropProps, overlay } = usePageFileDrop(addFiles, "Lepaskan untuk membuka PDF");
  usePasteFiles(addFiles);

  // Ambil teks semua halaman satu per satu; hasil tampil bertahap.
  const pdf = ready?.pdf;
  useEffect(() => {
    setPages(new Map());
    if (!pdf) return;
    let stop = false;
    (async () => {
      for (let n = 1; n <= pdf.numPages && !stop; n++) {
        const lines = await extractPageLines(pdf, n).catch(() => [] as string[]);
        if (stop) return;
        setPages((current) => new Map(current).set(n, lines));
      }
    })();
    return () => {
      stop = true;
    };
  }, [pdf]);

  const extracting = ready !== null && pages.size < pageCount;
  const text = useMemo(() => formatDocument(pages, selected, { markers, unwrap }), [pages, selected, markers, unwrap]);
  const stats = useMemo(() => textStats(text), [text]);
  const emptyPages = selected.filter((n) => pages.has(n) && (pages.get(n)?.length ?? 0) === 0).length;
  const noText = ready !== null && !extracting && [...pages.values()].every((lines) => lines.length === 0);
  const canSave = ready !== null && !extracting && text !== "";

  useEffect(() => {
    setStatus({ kind: "idle" });
  }, [text]);

  function applyDraft(event?: FormEvent) {
    event?.preventDefault();
    if (draft === null) return;
    const result = parsePageRanges(draft, pageCount);
    if (result.ok) {
      setSelected(result.pages);
      setDraft(null);
      setDraftError(null);
    } else setDraftError(result.error);
  }

  function save() {
    if (!ready || !canSave) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const filename = `${baseName(ready.file.name)}.txt`;
    downloadBlob(blob, filename);
    setStatus({ kind: "saved", filename, bytes: blob.size });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ kind: "copied" });
    } catch {
      setStatus({ kind: "error", message: "Browser menolak menyalin. Pilih teks lalu tekan Ctrl+C." });
    }
  }

  function reset() {
    openToken.current++;
    closeDoc();
    setDoc({ phase: "empty" });
    setFailures([]);
  }

  return (
    <div className="tool" {...dropProps}>
      <title>PDF ke Teks · Productivity Tools</title>

      <ToolBar
        title="PDF ke Teks"
        pill={ready ? `${pageCount.toLocaleString("id-ID")} halaman` : undefined}
        status={
          <>
            {extracting && `Mengambil teks halaman ${Math.min(pages.size + 1, pageCount)} dari ${pageCount}…`}
            {status.kind === "copied" && "Teks disalin ke clipboard"}
            {status.kind === "saved" && (
              <>
                Diunduh <span className="tool-bar__strong">{status.filename}</span>
                <span className="num"> · {formatBytes(status.bytes)}</span>
              </>
            )}
            {status.kind === "error" && <span className="tool-bar__error">{status.message}</span>}
          </>
        }
        actions={
          <>
            <button type="button" className="btn" onClick={copy} disabled={!canSave}>
              <Copy size={14} strokeWidth={1.5} aria-hidden="true" />
              <span className="hide-sm">Salin teks</span>
            </button>
            <button type="button" className="btn btn--primary" onClick={save} disabled={!canSave}>
              {extracting ? <LoaderCircle className="spin" size={14} strokeWidth={2} aria-hidden="true" /> : <Download size={14} strokeWidth={2} aria-hidden="true" />}
              Unduh .txt
            </button>
          </>
        }
      />

      <div className="tool-body tool-body--sidebar">
        <aside className="panel" aria-label="Pengaturan">
          <PanelSection title="Dokumen" aside={doc.phase !== "empty" ? formatBytes(doc.file.size) : undefined}>
            {doc.phase === "empty" ? (
              <FileDropzone
                icon={<FilePlus2 size={20} strokeWidth={1.5} aria-hidden="true" />}
                title="Pilih PDF"
                hint="Satu file PDF. Bisa juga diseret ke halaman ini atau ditempel (Ctrl+V)."
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
                  <button type="button" className="btn" onClick={picker.open}>
                    Ganti PDF
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={reset}>
                    Tutup
                  </button>
                </div>
              </div>
            )}
            <FailureList failures={failures} onDismiss={() => setFailures([])} />
          </PanelSection>

          <PanelSection title="Halaman" aside={ready ? `${selected.length} dari ${pageCount}` : undefined}>
            <form onSubmit={applyDraft}>
              <label className="number-field number-field--wide">
                <span className="segmented-field__label">Nomor halaman</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="mis. 1-3, 8"
                  disabled={!ready}
                  value={draft ?? formatPageRanges(selected)}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setDraftError(null);
                  }}
                  onBlur={() => applyDraft()}
                  aria-invalid={draftError ? true : undefined}
                  aria-describedby="text-pages-help"
                />
              </label>
            </form>
            <p id="text-pages-help" className={`field-note${draftError ? " field-note--error" : ""}`} role={draftError ? "alert" : undefined}>
              {draftError ?? "Kosongkan sebagian untuk mengambil teks dari halaman tertentu saja."}
            </p>
          </PanelSection>

          <PanelSection title="Susunan teks">
            <Toggle label="Tandai awal tiap halaman" description="Menulis “--- Halaman 3 ---” sebelum isi halaman." checked={markers} onChange={setMarkers} />
            <Toggle
              label="Gabung baris dalam paragraf"
              description="Untuk ditempel ke Word atau email: baris yang terpotong di PDF disambung."
              checked={unwrap}
              onChange={setUnwrap}
            />
          </PanelSection>

          {ready && !extracting && !noText && (
            <PanelSection title="Hasil">
              <dl className="summary num">
                <div>
                  <dt>Kata</dt>
                  <dd>{stats.words.toLocaleString("id-ID")}</dd>
                </div>
                <div>
                  <dt>Karakter</dt>
                  <dd>{stats.chars.toLocaleString("id-ID")}</dd>
                </div>
                <div>
                  <dt>Halaman tanpa teks</dt>
                  <dd>{emptyPages.toLocaleString("id-ID")}</dd>
                </div>
              </dl>
              {emptyPages > 0 && <p className="field-note">Halaman tanpa teks biasanya berupa gambar atau hasil scan.</p>}
            </PanelSection>
          )}
        </aside>

        <main className="panel workspace" aria-label="Teks hasil">
          {doc.phase === "empty" && (
            <button type="button" className="workspace__empty" onClick={picker.open}>
              <FilePlus2 size={32} strokeWidth={1.5} aria-hidden="true" />
              <strong>Pilih file PDF</strong>
              <span>Atau seret ke sini. Teksnya diambil di browser untuk disalin atau diunduh sebagai .txt; file tidak diunggah ke mana pun.</span>
            </button>
          )}

          {doc.phase === "opening" && (
            <>
              <header className="workspace__head">
                <h2>{doc.file.name}</h2>
                <p>Membuka PDF…</p>
              </header>
              <div className="workspace__body text-skeleton" aria-hidden="true">
                {[90, 76, 84, 40, 0, 88, 70, 80, 62].map((w, i) => (w ? <Bone key={i} w={`${w}%`} h={12} /> : <span key={i} />))}
              </div>
            </>
          )}

          {doc.phase === "password" && (
            <form
              className="workspace__empty pdf-password"
              onSubmit={(event) => {
                event.preventDefault();
                if (password) void open(doc.file, password);
              }}
            >
              <Lock size={32} strokeWidth={1.5} aria-hidden="true" />
              <strong>PDF ini dilindungi kata sandi</strong>
              <span>Kata sandi hanya dipakai di browser untuk membuka file ini.</span>
              <label className="number-field number-field--wide">
                <span className="visually-hidden">Kata sandi PDF</span>
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={doc.incorrect || undefined}
                  aria-describedby="password-error"
                />
              </label>
              {doc.incorrect && (
                <p id="password-error" className="field-note field-note--error" role="alert">
                  Kata sandi salah. Coba lagi.
                </p>
              )}
              <button type="submit" className="btn btn--primary" disabled={!password}>
                Buka PDF
              </button>
            </form>
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

          {ready && noText && (
            <div className="workspace__empty" role="status">
              <ScanText size={32} strokeWidth={1.5} aria-hidden="true" />
              <strong>Tidak ada teks yang bisa diambil</strong>
              <span>PDF ini kemungkinan hasil scan atau foto, jadi isinya berupa gambar. Mengenali teks dari gambar (OCR) belum didukung.</span>
            </div>
          )}

          {ready && !noText && (
            <>
              <header className="workspace__head">
                <h2>Teks</h2>
                <p className="num" aria-live="polite">
                  {extracting
                    ? `Mengambil teks ${pages.size} dari ${pageCount} halaman…`
                    : `${stats.words.toLocaleString("id-ID")} kata dari ${selected.length.toLocaleString("id-ID")} halaman`}
                </p>
              </header>
              <textarea className="text-output" readOnly value={text} aria-label="Teks dari PDF" spellCheck={false} />
            </>
          )}
        </main>
      </div>

      {picker.input}
      {overlay}
    </div>
  );
}
