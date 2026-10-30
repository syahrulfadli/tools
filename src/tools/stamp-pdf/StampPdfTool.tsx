import { useEffect, useState, type CSSProperties } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { Bone } from "../../components/Skeleton";
import { ToolBar } from "../../components/tool/ToolBar";
import { ColorSwatches, PanelSection, Segmented, Slider, Toggle } from "../../components/tool/controls";
import { FailureList } from "../../components/tool/FileDropzone";
import { PdfDocumentCard, PdfWorkspaceState } from "../../components/tool/PdfDocument";
import { usePdfDocument, usePdfThumbnails, useSinglePdfInput } from "../../components/tool/usePdfDocument";
import { baseName, downloadBlob, formatBytes } from "../../lib/files";
import { visualSize } from "../../lib/pdf-geometry";
import { stampPdf } from "./lib/apply";
import {
  CAP_HEIGHT,
  NUMBER_FORMATS,
  PT_PER_MM,
  formatPageNumber,
  lastPageNumber,
  pageNumberFor,
  unsupportedChars,
  type Horizontal,
  type NumberOptions,
  type Vertical,
  type WatermarkOptions,
} from "./lib/stamp";
import "../pdf-to-image/pdf-to-image.css";
import "./stamp-pdf.css";

type Status = { kind: "idle" } | { kind: "working"; done: number; total: number } | { kind: "done"; filename: string; bytes: number } | { kind: "error"; message: string };

const VERTICAL: { value: Vertical; label: string }[] = [
  { value: "top", label: "Atas" },
  { value: "bottom", label: "Bawah" },
];

const HORIZONTAL: { value: Horizontal; label: string }[] = [
  { value: "left", label: "Kiri" },
  { value: "center", label: "Tengah" },
  { value: "right", label: "Kanan" },
];

const ANGLES: { value: number; label: string }[] = [
  { value: 45, label: "Miring" },
  { value: 0, label: "Datar" },
];

const WATERMARK_COLORS = [
  { value: "#808080", label: "Abu" },
  { value: "#c4242a", label: "Merah" },
  { value: "#1b6c80", label: "Teal" },
] as const;

export default function StampPdfTool() {
  const { doc, open, close } = usePdfDocument();
  const [numbers, setNumbers] = useState<NumberOptions>({
    enabled: true,
    format: "n",
    vertical: "bottom",
    horizontal: "center",
    size: 11,
    marginMm: 12,
    startPage: 1,
    firstNumber: 1,
  });
  const [watermark, setWatermark] = useState<WatermarkOptions>({ enabled: false, text: "RAHASIA", size: 72, opacity: 0.2, angle: 45, color: "#808080" });
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const working = status.kind === "working";
  const ready = doc.phase === "ready" ? doc : null;
  const pageCount = ready?.pages.length ?? 0;
  const thumbs = usePdfThumbnails(ready?.pdf);
  const input = useSinglePdfInput(open, working);

  const patchNumbers = (patch: Partial<NumberOptions>) => setNumbers((current) => ({ ...current, ...patch }));
  const patchWatermark = (patch: Partial<WatermarkOptions>) => setWatermark((current) => ({ ...current, ...patch }));

  useEffect(() => {
    setStatus((current) => (current.kind === "working" ? current : { kind: "idle" }));
  }, [numbers, watermark, ready]);

  // Halaman mulai tidak boleh melewati jumlah halaman PDF yang baru dibuka.
  useEffect(() => {
    if (ready) setNumbers((current) => (current.startPage > ready.pages.length ? { ...current, startPage: 1 } : current));
  }, [ready]);

  const watermarkText = watermark.text.trim();
  const badChars = unsupportedChars(watermark.text);
  const last = lastPageNumber(pageCount, numbers);
  const numbered = numbers.enabled ? Math.max(0, pageCount - numbers.startPage + 1) : 0;
  const hasWork = numbered > 0 || (watermark.enabled && watermarkText !== "");
  const canSave = ready !== null && hasWork && (!watermark.enabled || badChars.length === 0) && !working;

  async function save() {
    if (!ready || !canSave) return;
    setStatus({ kind: "working", done: 0, total: pageCount });
    try {
      const blob = await stampPdf(ready.file, numbers, watermark, (done, total) => setStatus({ kind: "working", done, total }));
      const filename = `${baseName(ready.file.name)}-${numbered > 0 ? "bernomor" : "watermark"}.pdf`;
      downloadBlob(blob, filename);
      setStatus({ kind: "done", filename, bytes: blob.size });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    }
  }

  return (
    <div className="tool" {...input.dropProps}>
      <title>Nomor Halaman & Watermark · Productivity Tools</title>

      <ToolBar
        title="Nomor Halaman & Watermark"
        pill={ready ? `${pageCount.toLocaleString("id-ID")} halaman` : undefined}
        status={
          <>
            {status.kind === "working" && `Menulis halaman ${Math.min(status.done + 1, status.total)} dari ${status.total}…`}
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

          <PanelSection title="Nomor halaman" aside={numbers.enabled && ready ? `${numbered.toLocaleString("id-ID")} halaman` : undefined}>
            <Toggle label="Tambah nomor halaman" checked={numbers.enabled} onChange={(enabled) => patchNumbers({ enabled })} />
            {numbers.enabled && (
              <div className="stamp-fields">
                <div className="segmented-field">
                  <span className="segmented-field__label">Format</span>
                  <div className="chips" role="radiogroup" aria-label="Format nomor">
                    {NUMBER_FORMATS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={numbers.format === option.value}
                        className={`chip${numbers.format === option.value ? " is-active" : ""}`}
                        onClick={() => patchNumbers({ format: option.value })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Segmented label="Posisi" options={VERTICAL} value={numbers.vertical} onChange={(vertical) => patchNumbers({ vertical })} />
                <Segmented label="Rata" options={HORIZONTAL} value={numbers.horizontal} onChange={(horizontal) => patchNumbers({ horizontal })} />
                <Slider label="Ukuran huruf" min={8} max={24} value={numbers.size} display={`${numbers.size} pt`} onChange={(size) => patchNumbers({ size })} />
                <Slider label="Jarak dari tepi" min={5} max={30} value={numbers.marginMm} display={`${numbers.marginMm} mm`} onChange={(marginMm) => patchNumbers({ marginMm })} />
                <div className="steppers">
                  <NumberInput label="Mulai di halaman" value={numbers.startPage} min={1} max={Math.max(1, pageCount)} onChange={(startPage) => patchNumbers({ startPage })} />
                  <NumberInput label="Nomor pertama" value={numbers.firstNumber} min={0} max={9999} onChange={(firstNumber) => patchNumbers({ firstNumber })} />
                </div>
                <p className="field-note">
                  {numbers.startPage > 1
                    ? `Halaman 1–${numbers.startPage - 1} (mis. sampul) tidak diberi nomor.`
                    : "Naikkan “Mulai di halaman” untuk melewati sampul atau daftar isi."}
                </p>
              </div>
            )}
          </PanelSection>

          <PanelSection title="Watermark">
            <Toggle
              label="Tambah watermark"
              description="Teks transparan di tengah setiap halaman."
              checked={watermark.enabled}
              onChange={(enabled) => patchWatermark({ enabled })}
            />
            {watermark.enabled && (
              <div className="stamp-fields">
                <label className="number-field number-field--wide">
                  <span className="segmented-field__label">Teks</span>
                  <input
                    type="text"
                    value={watermark.text}
                    maxLength={60}
                    placeholder="mis. RAHASIA, DRAF, CONTOH"
                    onChange={(event) => patchWatermark({ text: event.target.value })}
                    aria-invalid={badChars.length ? true : undefined}
                    aria-describedby="watermark-help"
                  />
                </label>
                {badChars.length > 0 && (
                  <p id="watermark-help" className="field-note field-note--error" role="alert">
                    Karakter {badChars.slice(0, 5).join(" ")} tidak didukung font PDF standar. Pakai huruf Latin, angka, dan tanda baca umum.
                  </p>
                )}
                <Slider label="Ukuran huruf" min={24} max={160} step={4} value={watermark.size} display={`${watermark.size} pt`} onChange={(size) => patchWatermark({ size })} />
                <Slider
                  label="Kepekatan"
                  min={5}
                  max={60}
                  value={Math.round(watermark.opacity * 100)}
                  display={`${Math.round(watermark.opacity * 100)}%`}
                  onChange={(value) => patchWatermark({ opacity: value / 100 })}
                />
                <Segmented label="Arah" options={ANGLES} value={watermark.angle} onChange={(angle) => patchWatermark({ angle })} />
                <div className="segmented-field">
                  <span className="segmented-field__label">Warna</span>
                  <ColorSwatches label="Warna watermark" options={WATERMARK_COLORS} value={watermark.color} onChange={(color) => patchWatermark({ color })} />
                </div>
              </div>
            )}
          </PanelSection>
        </aside>

        <main className="panel workspace" aria-label="Pratinjau halaman">
          <PdfWorkspaceState
            doc={doc}
            onPick={input.picker.open}
            emptyTitle="Pilih file PDF"
            emptyHint="Atau seret ke sini. Tambahkan nomor halaman atau watermark; file tidak diunggah ke mana pun."
          />

          {ready && (
            <>
              <header className="workspace__head">
                <h2>{pageCount.toLocaleString("id-ID")} halaman</h2>
                <p className="num" aria-live="polite">
                  {ready.pdf && Object.keys(thumbs).length < pageCount
                    ? `Menyiapkan pratinjau ${Object.keys(thumbs).length} dari ${pageCount}…`
                    : hasWork
                      ? "Pratinjau perkiraan; posisi pasti mengikuti PDF hasil"
                      : "Nyalakan nomor halaman atau watermark di panel kiri"}
                </p>
              </header>
              <ul className="workspace__body page-grid">
                {ready.pages.map((box, i) => {
                  const page = i + 1;
                  const thumb = thumbs[page];
                  const size = visualSize(box);
                  const n = numbers.enabled ? pageNumberFor(page, numbers) : null;
                  // Ukuran dalam cqi (persen lebar halaman) agar pratinjau sebanding dengan poin PDF.
                  const pt = (value: number) => `${(value / size.width) * 100}cqi`;
                  const margin = numbers.marginMm * PT_PER_MM;
                  const numberStyle: CSSProperties = {
                    fontSize: pt(numbers.size),
                    [numbers.vertical]: `${(margin / size.height) * 100}%`,
                    ...(numbers.horizontal === "center" ? { left: "50%", translate: "-50% 0" } : { [numbers.horizontal]: `${(margin / size.width) * 100}%` }),
                  };
                  return (
                    <li key={page} className="page page--static">
                      <span className="page__sheet stamp-sheet" style={{ aspectRatio: `${size.width} / ${size.height}` }}>
                        {thumb ? <img src={thumb.url} alt="" /> : <Bone w="100%" h="100%" r={0} />}
                        {watermark.enabled && watermarkText && (
                          <span
                            className="stamp-watermark"
                            style={{ fontSize: pt(watermark.size), opacity: watermark.opacity, color: watermark.color, rotate: `${-watermark.angle}deg` }}
                          >
                            {watermarkText}
                          </span>
                        )}
                        {n !== null && (
                          <span className={`stamp-number stamp-number--${numbers.vertical}`} style={{ ...numberStyle, lineHeight: CAP_HEIGHT }}>
                            {formatPageNumber(numbers.format, n, last)}
                          </span>
                        )}
                      </span>
                      <span className="page__label num">Hal. {page}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </main>
      </div>

      {input.picker.input}
      {input.overlay}
    </div>
  );
}

/** Kolom angka kecil yang menjepit nilainya saat fokus lepas. */
function NumberInput({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const parsed = Math.round(Number(draft));
    if (draft.trim() !== "" && Number.isFinite(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
    setDraft(null);
  };
  return (
    <label className="number-field number-field--wide stamp-number-input">
      <span className="segmented-field__label">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft ?? value}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && commit()}
      />
    </label>
  );
}
