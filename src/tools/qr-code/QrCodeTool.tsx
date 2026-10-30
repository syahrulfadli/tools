import { useEffect, useMemo, useState } from "react";
import { Copy, Download, FileCode2, QrCode } from "lucide-react";
import { ToolBar } from "../../components/tool/ToolBar";
import { ColorSwatches, PanelSection, Segmented, Toggle } from "../../components/tool/controls";
import { canvasToBlob, releaseCanvas } from "../../lib/canvas";
import { downloadBlob, formatBytes } from "../../lib/files";
import {
  MAX_BYTES,
  QUIET_ZONE,
  byteLength,
  colorWarning,
  makeQr,
  normalizeLink,
  pixelsPerModule,
  qrFilename,
  qrPath,
  qrSvg,
  type Ecc,
  type QrMatrix,
  type QrStyle,
} from "./lib/qr";
import "./qr-code.css";

type Kind = "link" | "text";
type Status = { kind: "idle" } | { kind: "copied" } | { kind: "saved"; filename: string; bytes: number } | { kind: "error"; message: string };

const KINDS: { value: Kind; label: string }[] = [
  { value: "link", label: "Link" },
  { value: "text", label: "Teks" },
];

const LEVELS: { value: Ecc; label: string }[] = [
  { value: "L", label: "Rendah" },
  { value: "M", label: "Sedang" },
  { value: "Q", label: "Tinggi" },
  { value: "H", label: "Maks." },
];

const LEVEL_NOTES: Record<Ecc, string> = {
  L: "Tahan ±7% rusak. Kotak paling renggang, cocok untuk layar.",
  M: "Tahan ±15% rusak. Pilihan aman untuk kebanyakan keperluan.",
  Q: "Tahan ±25% rusak. Untuk cetakan yang bisa kotor atau tergores.",
  H: "Tahan ±30% rusak. Untuk stiker luar ruang atau QR yang ditimpa logo kecil.",
};

const SIZES: { value: number; label: string }[] = [
  { value: 512, label: "512 px" },
  { value: 1024, label: "1024 px" },
  { value: 2048, label: "2048 px" },
];

// Warna QR adalah isi gambar (bukan chrome), jadi nilainya tetap di kedua tema.
const FOREGROUNDS = [
  { value: "#000000", label: "Hitam" },
  { value: "#1b6c80", label: "Teal" },
] as const;

const BACKGROUNDS = [
  { value: "#ffffff", label: "Putih" },
  { value: "transparent", label: "Transparan" },
] as const;

async function toPng(matrix: QrMatrix, style: QrStyle, target: number) {
  const cell = pixelsPerModule(matrix, style.margin, target);
  const side = (matrix.size + style.margin * 2) * cell;
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung canvas 2D.");
  if (style.background !== "transparent") {
    ctx.fillStyle = style.background;
    ctx.fillRect(0, 0, side, side);
  }
  ctx.fillStyle = style.foreground;
  matrix.modules.forEach((row, y) => row.forEach((dark, x) => dark && ctx.fillRect((x + style.margin) * cell, (y + style.margin) * cell, cell, cell)));
  try {
    return { blob: await canvasToBlob(canvas, "image/png"), side };
  } finally {
    releaseCanvas(canvas);
  }
}

export default function QrCodeTool() {
  const [kind, setKind] = useState<Kind>("link");
  const [link, setLink] = useState("");
  const [text, setText] = useState("");
  const [ecc, setEcc] = useState<Ecc>("M");
  const [foreground, setForeground] = useState<string>("#000000");
  const [background, setBackground] = useState<string>("#ffffff");
  const [quiet, setQuiet] = useState(true);
  const [size, setSize] = useState(1024);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const linkResult = normalizeLink(link);
  const content = kind === "link" ? (linkResult.ok ? linkResult.url : "") : text;
  const inputError = kind === "link" && !linkResult.ok ? linkResult.error : "";
  const bytes = byteLength(content);

  const qr = useMemo((): { matrix: QrMatrix; error?: never } | { matrix?: never; error: string } | null => {
    if (!content) return null;
    try {
      return { matrix: makeQr(content, ecc) };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }, [content, ecc]);

  const matrix = qr?.matrix ?? null;
  const style: QrStyle = { margin: quiet ? QUIET_ZONE : 0, foreground, background };
  const warning = colorWarning(foreground, background);
  const side = matrix ? matrix.size + style.margin * 2 : 0;
  const pngSide = matrix ? pixelsPerModule(matrix, style.margin, size) * side : 0;
  const filename = qrFilename(content);

  useEffect(() => {
    setStatus({ kind: "idle" });
  }, [content, ecc, foreground, background, quiet, size]);

  async function savePng() {
    if (!matrix) return;
    try {
      const { blob } = await toPng(matrix, style, size);
      downloadBlob(blob, `${filename}.png`);
      setStatus({ kind: "saved", filename: `${filename}.png`, bytes: blob.size });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    }
  }

  function saveSvg() {
    if (!matrix) return;
    const blob = new Blob([qrSvg(matrix, style)], { type: "image/svg+xml" });
    downloadBlob(blob, `${filename}.svg`);
    setStatus({ kind: "saved", filename: `${filename}.svg`, bytes: blob.size });
  }

  async function copyImage() {
    if (!matrix) return;
    try {
      // ClipboardItem menerima promise, sehingga izin menulis tetap terikat ke klik user (Safari).
      await navigator.clipboard.write([new ClipboardItem({ "image/png": toPng(matrix, style, size).then((png) => png.blob) })]);
      setStatus({ kind: "copied" });
    } catch {
      setStatus({ kind: "error", message: "Browser ini belum bisa menyalin gambar. Unduh PNG saja." });
    }
  }

  return (
    <div className="tool">
      <title>QR Code · Productivity Tools</title>

      <ToolBar
        title="QR Code"
        pill={matrix ? `Versi ${matrix.version}` : undefined}
        status={
          <>
            {status.kind === "copied" && "Gambar QR disalin ke clipboard"}
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
            <button type="button" className="btn" onClick={copyImage} disabled={!matrix}>
              <Copy size={14} strokeWidth={1.5} aria-hidden="true" />
              <span className="hide-sm">Salin gambar</span>
            </button>
            <button type="button" className="btn" onClick={saveSvg} disabled={!matrix}>
              <FileCode2 size={14} strokeWidth={1.5} aria-hidden="true" />
              <span className="hide-sm">SVG</span>
            </button>
            <button type="button" className="btn btn--primary" onClick={savePng} disabled={!matrix}>
              <Download size={14} strokeWidth={2} aria-hidden="true" />
              Unduh PNG
            </button>
          </>
        }
      />

      <div className="tool-body tool-body--sidebar">
        <aside className="panel" aria-label="Pengaturan">
          <PanelSection title="Isi" aside={content ? `${bytes.toLocaleString("id-ID")} byte` : undefined}>
            <Segmented label="Jenis isi" options={KINDS} value={kind} onChange={setKind} />
            {kind === "link" ? (
              <label className="number-field number-field--wide qr-input">
                <span className="segmented-field__label">Link</span>
                <input
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="contoh.com/halaman"
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  aria-invalid={inputError ? true : undefined}
                  aria-describedby="qr-help"
                />
              </label>
            ) : (
              <label className="number-field number-field--wide qr-input">
                <span className="segmented-field__label">Teks</span>
                <textarea
                  rows={5}
                  placeholder="Ketik teks apa saja: nomor rekening, alamat, pesan…"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  aria-describedby="qr-help"
                />
              </label>
            )}
            <p id="qr-help" className={`field-note${inputError || qr?.error ? " field-note--error" : ""}`} role={inputError || qr?.error ? "alert" : undefined}>
              {inputError ||
                qr?.error ||
                (kind === "link"
                  ? linkResult.ok && linkResult.url !== link.trim()
                    ? `Dipindai sebagai ${linkResult.url}`
                    : "Tanpa https:// pun boleh; akan ditambahkan."
                  : `Maks. ${MAX_BYTES[ecc].toLocaleString("id-ID")} byte di tingkat ketahanan ini. Huruf beraksen dan simbol memakai 2–4 byte.`)}
            </p>
          </PanelSection>

          <PanelSection title="Ketahanan">
            <Segmented label="Tingkat koreksi kesalahan" options={LEVELS} value={ecc} onChange={setEcc} />
            <p className="field-note">{LEVEL_NOTES[ecc]}</p>
          </PanelSection>

          <PanelSection title="Warna">
            <div className="segmented-field">
              <span className="segmented-field__label">Kotak</span>
              <ColorSwatches label="Warna kotak" options={FOREGROUNDS} value={foreground} onChange={setForeground} />
            </div>
            <div className="segmented-field">
              <span className="segmented-field__label">Latar</span>
              <ColorSwatches label="Warna latar" options={BACKGROUNDS} value={background} onChange={setBackground} />
            </div>
            {warning && (
              <p className="field-note field-note--error" role="alert">
                {warning}
              </p>
            )}
          </PanelSection>

          <PanelSection title="Unduhan" aside={matrix ? `${pngSide} × ${pngSide} px` : undefined}>
            <Segmented label="Ukuran PNG" options={SIZES} value={size} onChange={setSize} />
            <Toggle
              label="Tepi kosong"
              description="Bingkai 4 kotak di sekeliling QR, dibutuhkan pemindai. Matikan hanya bila desainmu sudah memberi ruang."
              checked={quiet}
              onChange={setQuiet}
            />
          </PanelSection>
        </aside>

        <main className="panel workspace" aria-label="Pratinjau QR code">
          {matrix ? (
            <>
              <header className="workspace__head">
                <h2>QR code</h2>
                <p className="num">
                  {matrix.size} × {matrix.size} kotak · koreksi {LEVELS.find((level) => level.value === ecc)?.label.toLowerCase()}
                </p>
              </header>
              <div className="workspace__body qr-stage">
                <figure className={`qr-preview${background === "transparent" ? " qr-preview--transparent" : ""}`}>
                  <svg viewBox={`0 0 ${side} ${side}`} shapeRendering="crispEdges" role="img" aria-label={`QR code berisi ${content}`}>
                    {background !== "transparent" && <rect width={side} height={side} fill={background} />}
                    <path fill={foreground} d={qrPath(matrix.modules, style.margin)} />
                  </svg>
                </figure>
                <p className="qr-content" title={content}>
                  {content}
                </p>
                <p className="field-note">Coba pindai dengan kamera ponsel sebelum dicetak.</p>
              </div>
            </>
          ) : (
            <div className="workspace__empty qr-empty">
              <QrCode size={32} strokeWidth={1.5} aria-hidden="true" />
              <strong>{qr?.error ? "Isi terlalu panjang" : kind === "link" ? "Tempel link di panel kiri" : "Ketik teks di panel kiri"}</strong>
              <span>{qr?.error ?? "QR code langsung muncul di sini dan dibuat di browser; isinya tidak dikirim ke mana pun."}</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
