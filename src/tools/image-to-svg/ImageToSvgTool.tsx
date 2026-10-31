import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Download, ImagePlus, LoaderCircle, RotateCcw } from "lucide-react";
import { Bone } from "../../components/Skeleton";
import { ToolBar } from "../../components/tool/ToolBar";
import { PanelSection, Segmented, Slider } from "../../components/tool/controls";
import { FailureList, FileDropzone, type FileFailure } from "../../components/tool/FileDropzone";
import { useFilePicker, usePageFileDrop, usePasteFiles } from "../../components/tool/fileInput";
import { baseName, downloadBlob, formatBytes } from "../../lib/files";
import { embedSvg, traceSize } from "./lib/output";
import type { Detail, TraceMode } from "./lib/trace";
import { ACCEPTED_TYPES, isTraceable, rasterize, readDataUrl, startTrace } from "./lib/tracer";
import "./image-to-svg.css";

type Mode = TraceMode | "embed";

interface Source {
  file: File;
  bitmap: ImageBitmap;
  /** Object URL file asli untuk pratinjau "Asli". */
  url: string;
}

interface Settings {
  mode: Mode;
  colors: number;
  detail: Detail;
  threshold: number;
  maxEdge: number;
}

interface Result {
  key: string;
  blob: Blob;
  url: string;
  text: string;
  colors?: number;
  shapes?: number;
}

type Job = { kind: "idle" } | { kind: "tracing"; done: number; total: number } | { kind: "cancelled" } | { kind: "error"; message: string };

const MODES: { value: Mode; label: string }[] = [
  { value: "color", label: "Warna" },
  { value: "mono", label: "Hitam putih" },
  { value: "embed", label: "Sematkan" },
];

const MODE_NOTES: Record<Mode, string> = {
  color: "Gambar dilacak menjadi bentuk berwarna. Paling cocok untuk logo, ikon, ilustrasi datar, dan stiker.",
  mono: "Bagian gelap dilacak menjadi bentuk hitam di atas latar transparan. Cocok untuk tanda tangan, stempel, sketsa, dan logo satu warna.",
  embed: "Gambar asli dibungkus apa adanya di dalam file SVG. Tampilan tidak berubah, tapi tetap piksel dan pecah bila diperbesar.",
};

const DETAILS: { value: Detail; label: string }[] = [
  { value: "low", label: "Halus" },
  { value: "medium", label: "Seimbang" },
  { value: "high", label: "Rinci" },
];

const EDGES = [500, 1000, 2000].map((value) => ({ value, label: value.toLocaleString("id-ID") }));

const settingsKey = (s: Settings) =>
  s.mode === "embed" ? "embed" : `${s.mode}|${s.mode === "color" ? s.colors : s.threshold}|${s.detail}|${s.maxEdge}`;

export default function ImageToSvgTool() {
  const [source, setSource] = useState<Source | null>(null);
  const [opening, setOpening] = useState(false);
  const [failures, setFailures] = useState<FileFailure[]>([]);
  const [mode, setMode] = useState<Mode>("color");
  const [colors, setColors] = useState(16);
  const [detail, setDetail] = useState<Detail>("medium");
  const [threshold, setThreshold] = useState(128);
  const [maxEdge, setMaxEdge] = useState(1000);
  const [result, setResult] = useState<Result | null>(null);
  const [job, setJob] = useState<Job>({ kind: "idle" });
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "copied" } | { kind: "copy-failed" } | { kind: "done"; filename: string; bytes: number }>({ kind: "idle" });

  const live: Settings = { mode, colors, detail, threshold, maxEdge };
  const liveKey = settingsKey(live);

  // Pelacakan dimulai 300 ms setelah pengaturan berhenti berubah (slider tidak memicu lacak tiap langkah).
  const [settings, setSettings] = useState<Settings>(live);
  const latest = useRef(live);
  latest.current = live;
  useEffect(() => {
    const timer = setTimeout(() => setSettings(latest.current), 300);
    return () => clearTimeout(timer);
  }, [liveKey]);
  const key = settingsKey(settings);

  // Lepas bitmap dan object URL saat diganti atau tool ditutup.
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const resultRef = useRef(result);
  resultRef.current = result;
  useEffect(
    () => () => {
      if (sourceRef.current) closeSource(sourceRef.current);
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
    },
    [],
  );

  const replaceResult = useCallback((next: Result | null) => {
    setResult((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return next;
    });
  }, []);

  const openFiles = useCallback(
    async (files: File[]) => {
      const [file, ...rest] = files.filter(isTraceable);
      setFailures([
        ...files
          .filter((f) => !isTraceable(f))
          .map((f) => ({ name: f.name, reason: /\.svg$/i.test(f.name) ? "sudah berupa SVG." : "bukan PNG, JPEG, WebP, GIF, BMP, atau AVIF." })),
        ...rest.map((f) => ({ name: f.name, reason: "dilewati, satu gambar sekaligus." })),
      ]);
      if (!file) return;
      setOpening(true);
      try {
        const bitmap = await createImageBitmap(file);
        setSource((current) => {
          if (current) closeSource(current);
          return { file, bitmap, url: URL.createObjectURL(file) };
        });
        replaceResult(null);
        setStatus({ kind: "idle" });
      } catch {
        setFailures((current) => [...current, { name: file.name, reason: "tidak bisa dibaca sebagai gambar." }]);
      } finally {
        setOpening(false);
      }
    },
    [replaceResult],
  );

  const picker = useFilePicker(ACCEPTED_TYPES.join(","), false, (files) => void openFiles(files));
  const { dropProps, overlay } = usePageFileDrop((files) => void openFiles(files), "Lepaskan untuk membuka gambar");
  usePasteFiles((files) => void openFiles(files));

  // Satu pekerjaan per kombinasi gambar + pengaturan; pekerjaan lama dibatalkan.
  const cancelRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    const finish = (text: string, stats: Pick<Result, "colors" | "shapes">) => {
      if (cancelled) return;
      const blob = new Blob([text], { type: "image/svg+xml" });
      replaceResult({ key, blob, url: URL.createObjectURL(blob), text, ...stats });
      setJob({ kind: "idle" });
      setStatus({ kind: "idle" });
    };
    const fail = (error: Error) => !cancelled && setJob({ kind: "error", message: error.message });

    if (settings.mode === "embed") {
      setJob({ kind: "tracing", done: 0, total: 0 });
      readDataUrl(source.file)
        .then((url) => finish(embedSvg(url, source.bitmap.width, source.bitmap.height), {}))
        .catch(fail);
      return () => {
        cancelled = true;
      };
    }

    const size = traceSize(source.bitmap.width, source.bitmap.height, settings.maxEdge);
    setJob({ kind: "tracing", done: 0, total: 0 });
    const task = startTrace(
      {
        raster: rasterize(source.bitmap, size.width, size.height),
        settings: { mode: settings.mode, colors: settings.colors, detail: settings.detail, threshold: settings.threshold },
        output: { width: source.bitmap.width, height: source.bitmap.height },
      },
      (done, total) => !cancelled && setJob({ kind: "tracing", done, total }),
    );
    task.promise.then(({ svg, colors, shapes }) => finish(svg, { colors, shapes })).catch(fail);
    cancelRef.current = () => {
      cancelled = true;
      task.cancel();
      setJob({ kind: "cancelled" });
    };
    return () => {
      cancelled = true;
      task.cancel();
      cancelRef.current = null;
    };
    // `settings` selalu sejalan dengan `key`; `retry` menjalankan ulang pekerjaan yang dibatalkan.
  }, [source, key, retry]);

  function close() {
    if (source) closeSource(source);
    setSource(null);
    replaceResult(null);
    setFailures([]);
    setJob({ kind: "idle" });
    setStatus({ kind: "idle" });
  }

  const fresh = result?.key === key && liveKey === key ? result : undefined;
  const tracing = job.kind === "tracing" || (source !== null && !fresh && job.kind === "idle");
  const outName = source ? `${baseName(source.file.name)}.svg` : "gambar.svg";

  function download() {
    if (!fresh) return;
    downloadBlob(fresh.blob, outName);
    setStatus({ kind: "done", filename: outName, bytes: fresh.blob.size });
  }

  async function copy() {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh.text);
      setStatus({ kind: "copied" });
    } catch {
      setStatus({ kind: "copy-failed" });
    }
  }

  const traced = source ? traceSize(source.bitmap.width, source.bitmap.height, maxEdge) : null;
  const progress =
    job.kind === "tracing"
      ? job.total > 0
        ? `Melacak warna ${job.done} dari ${job.total}…`
        : mode === "embed"
          ? "Menyematkan gambar…"
          : "Mengelompokkan warna…"
      : job.kind === "cancelled"
        ? "Dibatalkan"
        : job.kind === "error"
          ? job.message
          : fresh
            ? `Siap · ${formatBytes(fresh.blob.size)}`
            : "Menunggu…";

  return (
    <div className="tool" {...dropProps}>
      <title>Gambar ke SVG · Productivity Tools</title>

      <ToolBar
        title="Gambar ke SVG"
        pill={fresh?.colors !== undefined ? `${fresh.colors} warna` : undefined}
        status={
          status.kind === "done" ? (
            <>
              Diunduh <span className="tool-bar__strong">{status.filename}</span>
              <span className="num"> · {formatBytes(status.bytes)}</span>
            </>
          ) : status.kind === "copied" ? (
            "Kode SVG disalin"
          ) : status.kind === "copy-failed" ? (
            <span className="tool-bar__error">Browser menolak menyalin ke clipboard.</span>
          ) : undefined
        }
        actions={
          <>
            <button type="button" className="btn" onClick={close} disabled={!source}>
              <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
              <span className="hide-sm">Mulai ulang</span>
            </button>
            <button type="button" className="btn btn--primary" onClick={download} disabled={!fresh}>
              {source && tracing ? (
                <LoaderCircle className="spin" size={14} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Download size={14} strokeWidth={2} aria-hidden="true" />
              )}
              Unduh SVG
            </button>
          </>
        }
      />

      <div className="tool-body tool-body--sidebar">
        <aside className="panel" aria-label="Pengaturan">
          <PanelSection title="Gambar">
            {!source ? (
              <FileDropzone
                icon={<ImagePlus size={20} strokeWidth={1.5} aria-hidden="true" />}
                title="Pilih gambar"
                hint="PNG, JPEG, WebP, GIF, BMP, AVIF. Bisa diseret atau ditempel (Ctrl+V)."
                onClick={picker.open}
              />
            ) : (
              <div className="doc-card">
                <ImagePlus size={20} strokeWidth={1.5} aria-hidden="true" />
                <p>
                  <span className="doc-card__name" title={source.file.name}>
                    {source.file.name}
                  </span>
                  <span className="num">
                    {px(source.bitmap.width)} × {px(source.bitmap.height)} px · {formatBytes(source.file.size)}
                  </span>
                </p>
                <div className="button-row">
                  <button type="button" className="btn" onClick={picker.open}>
                    Ganti gambar
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={close}>
                    Tutup
                  </button>
                </div>
              </div>
            )}
            {opening && (
              <p className="loading-line" role="status">
                Membuka gambar…
              </p>
            )}
            <FailureList failures={failures} onDismiss={() => setFailures([])} />
          </PanelSection>

          <PanelSection title="Cara konversi">
            <Segmented label="Hasil SVG" options={MODES} value={mode} onChange={setMode} />
            <p className="field-note">{MODE_NOTES[mode]}</p>
          </PanelSection>

          {mode === "color" && (
            <PanelSection title="Warna">
              <Slider label="Jumlah warna" value={colors} min={2} max={32} display={`${colors}`} onChange={setColors} />
              <p className="field-note">Sedikit warna menghasilkan file kecil dan bentuk rapi. Foto butuh banyak warna dan tetap terlihat seperti lukisan.</p>
            </PanelSection>
          )}

          {mode === "mono" && (
            <PanelSection title="Batas gelap">
              <Slider label="Ambang" value={threshold} min={1} max={254} display={`${Math.round((threshold / 255) * 100)}%`} onChange={setThreshold} />
              <p className="field-note">Geser ke kanan agar bagian abu-abu ikut menjadi hitam, ke kiri agar hanya bagian paling gelap.</p>
            </PanelSection>
          )}

          {mode !== "embed" && (
            <PanelSection title="Detail" aside={traced ? `${px(traced.width)} × ${px(traced.height)} px` : undefined}>
              <Segmented label="Kerapatan bentuk" options={DETAILS} value={detail} onChange={setDetail} />
              <Segmented label="Resolusi lacak, sisi terpanjang (px)" options={EDGES} value={maxEdge} onChange={setMaxEdge} />
              <p className="field-note">Halus membuang bintik kecil dan meratakan tepi. Resolusi lebih tinggi menangkap detail kecil, tapi lebih lama dan filenya lebih besar.</p>
            </PanelSection>
          )}

          {fresh && source && (
            <PanelSection title="Hasil">
              <dl className="summary num">
                <div>
                  <dt>Gambar asli</dt>
                  <dd>{formatBytes(source.file.size)}</dd>
                </div>
                <div>
                  <dt>File SVG</dt>
                  <dd>{formatBytes(fresh.blob.size)}</dd>
                </div>
                {fresh.colors !== undefined && (
                  <div>
                    <dt>Warna · bentuk</dt>
                    <dd>
                      {fresh.colors} · {fresh.shapes!.toLocaleString("id-ID")}
                    </dd>
                  </div>
                )}
              </dl>
            </PanelSection>
          )}
        </aside>

        <main className="panel workspace" aria-label="Pratinjau">
          {!source ? (
            <button type="button" className="workspace__empty" onClick={picker.open}>
              <ImagePlus size={32} strokeWidth={1.5} aria-hidden="true" />
              <strong>Pilih gambar untuk dijadikan SVG</strong>
              <span>Atau seret ke sini. Hasil terbaik dari logo dan ilustrasi berwarna datar. Gambar tidak diunggah ke mana pun.</span>
            </button>
          ) : (
            <>
              <header className="workspace__head">
                <h2>{outName}</h2>
                <div className="workspace__tools svg-tools">
                  <p className={`num${job.kind === "error" ? " delta--bad" : ""}`} aria-live="polite">
                    {progress}
                  </p>
                  {job.kind === "tracing" && mode !== "embed" && (
                    <button type="button" className="btn" onClick={() => cancelRef.current?.()}>
                      Batal
                    </button>
                  )}
                  {job.kind === "cancelled" && (
                    <button type="button" className="btn" onClick={() => setRetry((n) => n + 1)}>
                      Lacak lagi
                    </button>
                  )}
                  <button type="button" className="btn" onClick={copy} disabled={!fresh}>
                    <Copy size={14} strokeWidth={1.5} aria-hidden="true" />
                    Salin kode
                  </button>
                </div>
              </header>
              <div className="svg-compare">
                <figure>
                  <figcaption>Asli</figcaption>
                  <div className="svg-compare__frame">
                    <img src={source.url} alt={`Gambar asli ${source.file.name}`} />
                  </div>
                </figure>
                <figure>
                  <figcaption>SVG</figcaption>
                  <div className="svg-compare__frame">
                    {result ? (
                      <img src={result.url} alt={`Hasil SVG ${outName}`} className={fresh ? undefined : "is-stale"} />
                    ) : (
                      <Bone w="100%" h="100%" r={0} />
                    )}
                  </div>
                </figure>
              </div>
            </>
          )}
        </main>
      </div>

      {picker.input}
      {overlay}
    </div>
  );
}

function closeSource(source: Source) {
  source.bitmap.close();
  URL.revokeObjectURL(source.url);
}

function px(value: number) {
  return value.toLocaleString("id-ID");
}
