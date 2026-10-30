import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Check, Download, FilePlus2, FileText, LoaderCircle, Lock, X } from "lucide-react";
import { Bone } from "../../components/Skeleton";
import { ToolBar } from "../../components/tool/ToolBar";
import { PanelSection, Segmented, Slider } from "../../components/tool/controls";
import { FailureList, FileDropzone, type FileFailure } from "../../components/tool/FileDropzone";
import { useFilePicker, usePageFileDrop, usePasteFiles } from "../../components/tool/fileInput";
import { baseName, downloadBlob, formatBytes } from "../../lib/files";
import { createZip, type ZipEntry } from "../../lib/zip";
import { formatPageRanges, pageFilename, parsePageRanges } from "./lib/pages";
import { openPdf, pageSize, pageThumbnail, pageToImage, PdfPasswordError, type ImageFormat, type PDFDocumentProxy } from "./lib/pdf";
import "./pdf-to-image.css";

const FORMATS: { value: ImageFormat; label: string }[] = [
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
];

const DPI_OPTIONS = [
  { value: 72, label: "72 dpi" },
  { value: 150, label: "150 dpi" },
  { value: 300, label: "300 dpi" },
];

type Doc =
  | { phase: "empty" }
  | { phase: "opening"; file: File }
  | { phase: "password"; file: File; incorrect: boolean }
  | { phase: "error"; file: File; message: string }
  | { phase: "ready"; file: File; pdf: PDFDocumentProxy; pageCount: number; aspect: number };

type Status =
  | { kind: "idle" }
  | { kind: "converting"; done: number; total: number }
  | { kind: "done"; filename: string; bytes: number; count: number }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

interface Thumb {
  url: string;
  width: number;
  height: number;
}

function isPdf(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export default function PdfToImageTool() {
  const [doc, setDoc] = useState<Doc>({ phase: "empty" });
  const [thumbs, setThumbs] = useState<Record<number, Thumb>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dpi, setDpi] = useState(150);
  const [format, setFormat] = useState<ImageFormat>("jpeg");
  const [quality, setQuality] = useState(90);
  const [size, setSize] = useState<{ width: number; height: number; limited: boolean } | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [failures, setFailures] = useState<FileFailure[]>([]);
  const [rangeDraft, setRangeDraft] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const cancelled = useRef(false);
  const lastClicked = useRef<number | null>(null);

  const ready = doc.phase === "ready" ? doc : null;
  const pageCount = ready?.pageCount ?? 0;
  const converting = status.kind === "converting";

  // Dokumen yang sedang terbuka; ditutup (worker pdf.js dan memorinya) saat diganti atau tool ditutup.
  const openDoc = useRef<PDFDocumentProxy | null>(null);
  const closeDoc = useCallback(() => {
    void openDoc.current?.destroy();
    openDoc.current = null;
  }, []);
  useEffect(() => closeDoc, [closeDoc]);

  const openToken = useRef(0);
  const open = useCallback(async (file: File, pass?: string) => {
    const token = ++openToken.current;
    closeDoc();
    setDoc({ phase: "opening", file });
    setStatus({ kind: "idle" });
    try {
      const pdf = await openPdf(file, pass);
      // PDF lain dipilih selama yang ini dibuka: buang hasil yang sudah usang.
      if (token !== openToken.current) return void pdf.destroy();
      openDoc.current = pdf;
      const first = (await pdf.getPage(1)).getViewport({ scale: 1 });
      setDoc({ phase: "ready", file, pdf, pageCount: pdf.numPages, aspect: first.width / first.height });
      setSelected(new Set(Array.from({ length: pdf.numPages }, (_, i) => i + 1)));
      setPassword("");
    } catch (error) {
      if (token !== openToken.current) return;
      if (error instanceof PdfPasswordError) setDoc({ phase: "password", file, incorrect: error.incorrect });
      else setDoc({ phase: "error", file, message: (error as Error).message });
    }
  }, [closeDoc]);

  const addFiles = useCallback(
    (files: File[]) => {
      const pdf = files.find(isPdf);
      const rejected = files
        .filter((file) => file !== pdf)
        .map((file) => ({ name: file.name, reason: isPdf(file) ? "dilewati: satu PDF sekaligus." : "bukan file PDF." }));
      setFailures(rejected);
      if (pdf && !converting) void open(pdf);
    },
    [converting, open],
  );

  const picker = useFilePicker("application/pdf,.pdf", false, addFiles);
  const { dropProps, overlay } = usePageFileDrop(addFiles, "Lepaskan untuk membuka PDF");
  usePasteFiles(addFiles);

  const pdf = ready?.pdf;

  // Thumbnail dibuat berurutan di latar; progresnya tampil di kepala area kerja.
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
          // Halaman yang gagal dipratinjau tetap bisa dicoba saat konversi.
        }
      }
    })();
    return () => {
      stop = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pdf]);

  useEffect(() => {
    if (!pdf) return setSize(null);
    let stop = false;
    void pageSize(pdf, 1, dpi).then((next) => !stop && setSize(next));
    return () => {
      stop = true;
    };
  }, [pdf, dpi]);

  // Pengaturan berubah: pesan unduhan lama tidak berlaku lagi.
  useEffect(() => {
    setStatus((current) => (current.kind === "converting" ? current : { kind: "idle" }));
  }, [selected, dpi, quality, format]);

  function togglePage(page: number, event: MouseEvent) {
    setSelected((current) => {
      const next = new Set(current);
      // Shift+klik memilih/melepas satu rentang mengikuti keadaan halaman yang diklik.
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

  function applyRange(event?: FormEvent) {
    event?.preventDefault();
    if (rangeDraft === null) return;
    const result = parsePageRanges(rangeDraft, pageCount);
    if (result.ok) {
      setSelected(new Set(result.pages));
      setRangeDraft(null);
      setRangeError(null);
    } else setRangeError(result.error);
  }

  async function convert() {
    if (!ready || selected.size === 0) return;
    const pages = [...selected].sort((a, b) => a - b);
    const base = baseName(ready.file.name);
    const ext = format === "jpeg" ? "jpg" : "png";
    cancelled.current = false;
    setStatus({ kind: "converting", done: 0, total: pages.length });
    try {
      const entries: ZipEntry[] = [];
      for (const [i, page] of pages.entries()) {
        if (cancelled.current) return setStatus({ kind: "cancelled" });
        const { blob } = await pageToImage(ready.pdf, page, dpi, format, quality / 100);
        entries.push({ name: pageFilename(base, page, ready.pageCount, ext), data: blob });
        setStatus({ kind: "converting", done: i + 1, total: pages.length });
      }
      if (cancelled.current) return setStatus({ kind: "cancelled" });
      const [single] = entries;
      const out = entries.length === 1 ? { name: single.name, blob: single.data as Blob } : { name: `${base}-${ext}.zip`, blob: await createZip(entries) };
      downloadBlob(out.blob, out.name);
      setStatus({ kind: "done", filename: out.name, bytes: out.blob.size, count: entries.length });
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
  const formatLabel = format === "jpeg" ? "JPEG" : "PNG";
  const primaryLabel =
    selected.size <= 1 ? `Unduh ${formatLabel}` : `Unduh ${selected.size.toLocaleString("id-ID")} ${formatLabel} (ZIP)`;

  return (
    <div className="tool" {...dropProps}>
      <title>PDF ke Gambar · Productivity Tools</title>

      <ToolBar
        title="PDF ke Gambar"
        pill={ready ? `${selected.size} dari ${pageCount} halaman dipilih` : undefined}
        status={
          <>
            {status.kind === "converting" && `Mengonversi halaman ${Math.min(status.done + 1, status.total)} dari ${status.total}…`}
            {status.kind === "done" && (
              <>
                Diunduh <span className="tool-bar__strong">{status.filename}</span>
                <span className="num"> · {formatBytes(status.bytes)}</span>
              </>
            )}
            {status.kind === "cancelled" && "Konversi dibatalkan."}
            {status.kind === "error" && <span className="tool-bar__error">{status.message}</span>}
          </>
        }
        actions={
          converting ? (
            <>
              <button type="button" className="btn" onClick={() => (cancelled.current = true)}>
                <X size={14} strokeWidth={1.5} aria-hidden="true" />
                Batal
              </button>
              <button type="button" className="btn btn--primary" disabled>
                <LoaderCircle className="spin" size={14} strokeWidth={2} aria-hidden="true" />
                <span className="num">
                  {status.done}/{status.total}
                </span>
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--primary" onClick={convert} disabled={!ready || selected.size === 0}>
              <Download size={14} strokeWidth={2} aria-hidden="true" />
              {primaryLabel}
            </button>
          )
        }
      />

      <div className="tool-body tool-body--sidebar">
        <aside className="panel" aria-label="Pengaturan">
          <PanelSection title="Dokumen" aside={doc.phase !== "empty" ? formatBytes(doc.file.size) : undefined}>
            {doc.phase === "empty" ? (
              <FileDropzone
                icon={<FilePlus2 size={20} strokeWidth={1.5} aria-hidden="true" />}
                title="Pilih PDF"
                hint="Satu file PDF. Bisa juga diseret ke halaman ini."
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
                  <button type="button" className="btn" onClick={picker.open} disabled={converting}>
                    Ganti PDF
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={reset} disabled={converting}>
                    Tutup
                  </button>
                </div>
              </div>
            )}
            <FailureList failures={failures} onDismiss={() => setFailures([])} />
          </PanelSection>

          <PanelSection title="Resolusi" aside={size ? `${size.width.toLocaleString("id-ID")} × ${size.height.toLocaleString("id-ID")} px` : undefined}>
            <Segmented label="Titik per inci" options={DPI_OPTIONS} value={dpi} onChange={setDpi} />
            <p className="field-note">
              72 dpi cukup untuk dilihat di layar, 150 dpi untuk dibagikan, 300 dpi untuk dicetak.
              {size && " Ukuran di atas untuk halaman 1."}
              {size?.limited && " Halaman ini sangat besar, jadi resolusinya diturunkan agar tetap bisa diproses browser."}
            </p>
          </PanelSection>

          <PanelSection title="Format gambar">
            <Segmented label="Simpan sebagai" options={FORMATS} value={format} onChange={setFormat} />
            {format === "jpeg" ? (
              <>
                <Slider label="Kualitas JPEG" value={quality} min={50} max={100} display={`${quality}%`} onChange={setQuality} />
                <p className="field-note">JPEG ringan, cocok untuk dibagikan. Makin tinggi kualitasnya makin tajam, tapi file makin besar; 85–92% biasanya pas.</p>
              </>
            ) : (
              <p className="field-note">PNG tanpa kompresi lossy: teks dan garis tetap tajam, tapi file jauh lebih besar dari JPEG.</p>
            )}
          </PanelSection>

          <PanelSection title="Halaman" aside={ready ? `${selected.size} dari ${pageCount}` : undefined}>
            <form onSubmit={applyRange}>
              <label className="number-field number-field--wide">
                <span className="segmented-field__label">Nomor halaman</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="mis. 1-3, 8"
                  disabled={!ready}
                  value={rangeDraft ?? formatPageRanges(selected)}
                  onChange={(event) => {
                    setRangeDraft(event.target.value);
                    setRangeError(null);
                  }}
                  onBlur={() => applyRange()}
                  aria-invalid={rangeError ? true : undefined}
                  aria-describedby="range-help"
                />
              </label>
            </form>
            <p id="range-help" className={`field-note${rangeError ? " field-note--error" : ""}`} role={rangeError ? "alert" : undefined}>
              {rangeError ?? "Klik halaman untuk memilih. Shift+klik memilih satu rentang."}
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn"
                disabled={!ready || selected.size === pageCount}
                onClick={() => setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)))}
              >
                Pilih semua
              </button>
              <button type="button" className="btn" disabled={!ready || selected.size === 0} onClick={() => setSelected(new Set())}>
                Kosongkan
              </button>
            </div>
          </PanelSection>
        </aside>

        <main className="panel workspace" aria-label="Halaman PDF">
          {doc.phase === "empty" && (
            <button type="button" className="workspace__empty" onClick={picker.open}>
              <FilePlus2 size={32} strokeWidth={1.5} aria-hidden="true" />
              <strong>Pilih file PDF</strong>
              <span>Atau seret ke sini. Tiap halaman jadi satu gambar JPEG atau PNG; PDF tidak diunggah ke mana pun.</span>
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

          {ready && (
            <>
              <WorkspaceHead
                title={`${pageCount.toLocaleString("id-ID")} halaman`}
                note={
                  thumbsDone < pageCount
                    ? `Menyiapkan pratinjau ${thumbsDone} dari ${pageCount}…`
                    : `${selected.size} halaman akan diubah ke ${formatLabel}`
                }
              />
              <ul className="workspace__body page-grid">
                {Array.from({ length: pageCount }, (_, i) => {
                  const page = i + 1;
                  const thumb = thumbs[page];
                  const on = selected.has(page);
                  return (
                    <li key={page}>
                      <button
                        type="button"
                        className={`page${on ? " is-selected" : ""}`}
                        aria-pressed={on}
                        aria-label={`Halaman ${page}`}
                        onClick={(event) => togglePage(page, event)}
                      >
                        <span className="page__sheet" style={{ aspectRatio: thumb ? `${thumb.width} / ${thumb.height}` : String(ready.aspect) }}>
                          {thumb ? <img src={thumb.url} alt="" /> : <Bone w="100%" h="100%" r={0} />}
                          <span className="page__check" aria-hidden="true">
                            {on && <Check size={14} strokeWidth={2.5} />}
                          </span>
                        </span>
                        <span className="page__label num">Hal. {page}</span>
                      </button>
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
