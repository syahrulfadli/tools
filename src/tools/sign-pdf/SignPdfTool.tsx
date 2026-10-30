import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Download, ImageUp, LoaderCircle, Plus, Undo2 } from "lucide-react";
import { ToolBar } from "../../components/tool/ToolBar";
import { ColorSwatches, PanelSection, Segmented, Toggle } from "../../components/tool/controls";
import { FailureList } from "../../components/tool/FileDropzone";
import { useFilePicker } from "../../components/tool/fileInput";
import { PdfDocumentCard, PdfWorkspaceState } from "../../components/tool/PdfDocument";
import { usePageImage, usePdfDocument, useSinglePdfInput } from "../../components/tool/usePdfDocument";
import { baseName, downloadBlob, formatBytes } from "../../lib/files";
import { visualSize } from "../../lib/pdf-geometry";
import { PageStage } from "./components/PageStage";
import { SignaturePad } from "./components/SignaturePad";
import { signPdf } from "./lib/apply";
import { clampPlacement, placeAt, type Placement } from "./lib/placement";
import { imageToSignature, strokesToSignature, type Signature } from "./lib/render";
import type { Stroke } from "./lib/signature";
import "./sign-pdf.css";

type Source = "draw" | "upload";
type Status = { kind: "idle" } | { kind: "working" } | { kind: "done"; filename: string; bytes: number } | { kind: "error"; message: string };

const SOURCES: { value: Source; label: string }[] = [
  { value: "draw", label: "Gambar" },
  { value: "upload", label: "Unggah gambar" },
];

// Warna tinta adalah isi file (bukan chrome), jadi nilainya tetap di kedua tema.
const INKS = [
  { value: "#1a1a1a", label: "Hitam" },
  { value: "#1d3f9a", label: "Biru" },
] as const;

const WIDTHS: { value: number; label: string }[] = [
  { value: 1.6, label: "Tipis" },
  { value: 2.6, label: "Sedang" },
  { value: 4, label: "Tebal" },
];

/** Lebar render halaman besar: cukup tajam di layar retina tanpa memakan banyak memori. */
const STAGE_WIDTH = Math.min(1600, Math.round(900 * Math.min(2, window.devicePixelRatio || 1)));

export default function SignPdfTool() {
  const { doc, open, close } = usePdfDocument();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [source, setSource] = useState<Source>("draw");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [ink, setInk] = useState<string>(INKS[0].value);
  const [lineWidth, setLineWidth] = useState(2.6);
  const [upload, setUpload] = useState<File | null>(null);
  const [removeWhite, setRemoveWhite] = useState(true);
  const [signature, setSignature] = useState<Signature | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const working = status.kind === "working";
  const ready = doc.phase === "ready" ? doc : null;
  const pageCount = ready?.pages.length ?? 0;
  const input = useSinglePdfInput(open, working);
  const image = usePageImage(ready?.pdf, page, STAGE_WIDTH);
  const size = ready ? visualSize(ready.pages[page - 1]) : { width: 1, height: 1.414 };
  const aspect = size.width / size.height;
  const ratio = signature ? signature.height / signature.width : 0.4;
  const aspectOf = (n: number) => {
    const s = ready ? visualSize(ready.pages[n - 1]) : size;
    return s.width / s.height;
  };

  useEffect(() => {
    setPage(1);
    setPlacements([]);
    setSelected(null);
  }, [ready]);

  useEffect(() => {
    setStatus((current) => (current.kind === "working" ? current : { kind: "idle" }));
  }, [placements, signature, ready]);

  // Bangun PNG tanda tangan dari sumber aktif. Object URL lama dilepas saat diganti.
  useEffect(() => {
    let stop = false;
    const build = source === "draw" ? strokesToSignature(strokes, ink, lineWidth) : upload ? imageToSignature(upload, removeWhite) : Promise.resolve(null);
    build.then(
      (next) => {
        if (stop) return next && URL.revokeObjectURL(next.url);
        setSignature(next);
        setSignatureError(null);
      },
      (error: Error) => {
        if (stop) return;
        setSignature(null);
        setSignatureError(error.message);
      },
    );
    return () => {
      stop = true;
    };
  }, [source, strokes, ink, lineWidth, upload, removeWhite]);

  const lastUrl = useRef<string | null>(null);
  useEffect(() => {
    if (lastUrl.current && lastUrl.current !== signature?.url) URL.revokeObjectURL(lastUrl.current);
    lastUrl.current = signature?.url ?? null;
  }, [signature]);
  useEffect(() => () => void (lastUrl.current && URL.revokeObjectURL(lastUrl.current)), []);

  // Rasio tanda tangan bisa berubah (gambar ulang); jepit ulang semua posisi agar tetap di halaman.
  useEffect(() => {
    if (!signature) return;
    const r = signature.height / signature.width;
    setPlacements((current) => current.map((p) => clampPlacement(p, r, aspectOf(p.page))));
    // aspectOf hanya bergantung pada `ready`, yang tidak berubah saat tanda tangan berubah.
  }, [signature]);

  const imagePicker = useFilePicker("image/png,image/jpeg,image/webp", false, (files) => {
    setUpload(files[0]);
    setSource("upload");
  });

  const onPage = placements.filter((p) => p.page === page);
  const pagesWithSignature = [...new Set(placements.map((p) => p.page))].sort((a, b) => a - b);
  const selectedPlacement = placements.find((p) => p.id === selected) ?? null;
  const canSave = ready !== null && signature !== null && placements.length > 0 && !working;

  function place(cx = 0.7, cy = 0.82) {
    if (!signature || !ready) return;
    const placement = placeAt(crypto.randomUUID(), page, cx, cy, ratio, aspect);
    setPlacements((current) => [...current, placement]);
    setSelected(placement.id);
  }

  function copyToAllPages() {
    if (!selectedPlacement || !ready) return;
    const others = Array.from({ length: pageCount }, (_, i) => i + 1).filter((n) => n !== selectedPlacement.page && !placements.some((p) => p.page === n));
    const copies = others.map((n) => clampPlacement({ ...selectedPlacement, id: crypto.randomUUID(), page: n }, ratio, aspectOf(n)));
    setPlacements((current) => [...current, ...copies]);
  }

  async function save() {
    if (!ready || !signature || !canSave) return;
    setStatus({ kind: "working" });
    try {
      const blob = await signPdf(ready.file, signature.bytes, ratio, placements);
      const filename = `${baseName(ready.file.name)}-ditandatangani.pdf`;
      downloadBlob(blob, filename);
      setStatus({ kind: "done", filename, bytes: blob.size });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    }
  }

  return (
    <div className="tool" {...input.dropProps}>
      <title>Tanda Tangan PDF · Productivity Tools</title>

      <ToolBar
        title="Tanda Tangan PDF"
        pill={placements.length ? `${placements.length} tanda tangan` : undefined}
        status={
          <>
            {status.kind === "working" && "Menempel tanda tangan…"}
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

          <PanelSection title="Tanda tangan">
            <Segmented label="Sumber" options={SOURCES} value={source} onChange={setSource} />
            {source === "draw" ? (
              <div className="sign-fields">
                <SignaturePad strokes={strokes} color={ink} lineWidth={lineWidth} onChange={setStrokes} />
                <div className="button-row button-row--flush">
                  <button type="button" className="btn" disabled={strokes.length === 0} onClick={() => setStrokes((current) => current.slice(0, -1))}>
                    <Undo2 size={14} strokeWidth={1.5} aria-hidden="true" />
                    Urungkan
                  </button>
                  <button type="button" className="btn btn--ghost" disabled={strokes.length === 0} onClick={() => setStrokes([])}>
                    Hapus
                  </button>
                </div>
                <div className="segmented-field">
                  <span className="segmented-field__label">Warna tinta</span>
                  <ColorSwatches label="Warna tinta" options={INKS} value={ink} onChange={setInk} />
                </div>
                <Segmented label="Tebal garis" options={WIDTHS} value={lineWidth} onChange={setLineWidth} />
              </div>
            ) : (
              <div className="sign-fields">
                {signature && upload ? (
                  <div className="sign-upload">
                    <img src={signature.url} alt="Tanda tangan yang diunggah" />
                  </div>
                ) : null}
                <button type="button" className="btn" onClick={imagePicker.open}>
                  <ImageUp size={14} strokeWidth={1.5} aria-hidden="true" />
                  {upload ? "Ganti gambar" : "Pilih gambar tanda tangan"}
                </button>
                <Toggle label="Buang latar putih" description="Untuk foto atau scan tanda tangan di kertas putih." checked={removeWhite} onChange={setRemoveWhite} />
              </div>
            )}
            {signatureError && (
              <p className="field-note field-note--error" role="alert">
                {signatureError}
              </p>
            )}
          </PanelSection>

          <PanelSection title="Penempatan" aside={pagesWithSignature.length ? `${pagesWithSignature.length} halaman` : undefined}>
            <p className="field-note sign-note">
              {!signature
                ? "Buat tanda tangan dulu, lalu klik di halaman untuk menempelnya."
                : "Klik di halaman untuk menempel. Seret untuk memindah, tarik sudut kanan bawah untuk mengubah ukuran."}
            </p>
            <div className="button-row">
              <button type="button" className="btn" disabled={!selectedPlacement || pageCount < 2} onClick={copyToAllPages}>
                <Copy size={14} strokeWidth={1.5} aria-hidden="true" />
                Salin ke semua halaman
              </button>
              <button type="button" className="btn btn--ghost" disabled={placements.length === 0} onClick={() => setPlacements([])}>
                Hapus semua
              </button>
            </div>
            {pagesWithSignature.length > 0 && (
              <div className="chips sign-pages" aria-label="Halaman bertanda tangan">
                {pagesWithSignature.map((n) => (
                  <button key={n} type="button" className={`chip${n === page ? " is-active" : ""}`} onClick={() => setPage(n)}>
                    Hal. {n}
                  </button>
                ))}
              </div>
            )}
          </PanelSection>
        </aside>

        <main className="panel workspace" aria-label="Halaman PDF">
          <PdfWorkspaceState
            doc={doc}
            onPick={input.picker.open}
            emptyTitle="Pilih PDF yang mau ditandatangani"
            emptyHint="Atau seret ke sini. Tanda tangan dan PDF diproses di browser, tidak diunggah ke mana pun."
          />

          {ready && (
            <>
              <header className="workspace__head">
                <div className="sign-pager">
                  <button type="button" className="btn btn--icon" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Halaman sebelumnya">
                    <ChevronLeft size={16} strokeWidth={1.5} />
                  </button>
                  <h2 className="num" aria-live="polite">
                    Halaman {page} dari {pageCount}
                  </h2>
                  <button type="button" className="btn btn--icon" disabled={page >= pageCount} onClick={() => setPage(page + 1)} aria-label="Halaman berikutnya">
                    <ChevronRight size={16} strokeWidth={1.5} />
                  </button>
                </div>
                <button type="button" className="btn" disabled={!signature} onClick={() => place()}>
                  <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
                  Tempel di halaman ini
                </button>
              </header>
              <div className="workspace__body sign-body">
                <PageStage
                  image={ready.pdf ? image : null}
                  aspect={aspect}
                  signatureUrl={signature?.url ?? null}
                  ratio={ratio}
                  placements={onPage}
                  selected={selected}
                  onSelect={setSelected}
                  onChange={(next) => setPlacements((current) => current.map((p) => (p.id === next.id ? next : p)))}
                  onRemove={(id) => {
                    setPlacements((current) => current.filter((p) => p.id !== id));
                    setSelected(null);
                  }}
                  onPlace={place}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {input.picker.input}
      {imagePicker.input}
      {input.overlay}
    </div>
  );
}
