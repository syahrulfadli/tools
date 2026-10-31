import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileImage, LoaderCircle, RotateCcw, X } from "lucide-react";
import { Bone } from "../../components/Skeleton";
import { ToolBar } from "../../components/tool/ToolBar";
import { ColorSwatches, NumberInput, PanelSection, Segmented, Slider } from "../../components/tool/controls";
import { FailureList, FileDropzone, type FileFailure } from "../../components/tool/FileDropzone";
import { useFilePicker, usePageFileDrop, usePasteFiles } from "../../components/tool/fileInput";
import { baseName, downloadBlob, fileStamp, formatBytes, uniqueNamer } from "../../lib/files";
import { createZip } from "../../lib/zip";
import { ACCEPTED_TYPES, isSvg, looksLikeSvg, readSvg, renderSvg, type OutputFormat, type SvgSource } from "./lib/render";
import { outputSize, type Sizing } from "./lib/size";
import "./svg-to-image.css";

interface Item {
  id: string;
  name: string;
  size: number;
  source: SvgSource;
  /** Object URL SVG asli untuk thumbnail sebelum hasil siap. */
  thumbUrl: string;
  result?: { key: string; blob: Blob; url: string; width: number; height: number };
  error?: string;
}

const FORMATS: { value: OutputFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
];

const SIZE_MODES: { value: Sizing["mode"]; label: string }[] = [
  { value: "scale", label: "Skala" },
  { value: "width", label: "Lebar tetap" },
];

const SCALES = [1, 2, 3, 4].map((value) => ({ value, label: `${value}×` }));

const PNG_BACKGROUNDS = [
  { value: "transparent", label: "Transparan" },
  { value: "#ffffff", label: "Putih" },
  { value: "#000000", label: "Hitam" },
] as const;

const JPEG_BACKGROUNDS = PNG_BACKGROUNDS.slice(1);

const EXTENSION: Record<OutputFormat, string> = { png: "png", jpeg: "jpg" };

interface Settings {
  format: OutputFormat;
  quality: number;
  background: string;
  sizing: Sizing;
}

const settingsKey = (s: Settings) =>
  `${s.format}|${s.format === "jpeg" ? s.quality : ""}|${s.background}|${s.sizing.mode === "scale" ? `x${s.sizing.scale}` : `w${s.sizing.width}`}`;

export default function SvgToImageTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [format, setFormat] = useState<OutputFormat>("png");
  const [quality, setQuality] = useState(92);
  const [pngBackground, setPngBackground] = useState("transparent");
  const [jpegBackground, setJpegBackground] = useState("#ffffff");
  const [sizeMode, setSizeMode] = useState<Sizing["mode"]>("scale");
  const [scale, setScale] = useState(2);
  const [fixedWidth, setFixedWidth] = useState(1024);
  const [reading, setReading] = useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = useState<FileFailure[]>([]);
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "zipping" } | { kind: "done"; filename: string; bytes: number }>({
    kind: "idle",
  });

  const background = format === "png" ? pngBackground : jpegBackground;
  const sizing: Sizing = sizeMode === "scale" ? { mode: "scale", scale } : { mode: "width", width: fixedWidth };
  const live: Settings = { format, quality: quality / 100, background, sizing };
  const liveKey = settingsKey(live);

  // Pengaturan yang dipakai render diperbarui 250 ms setelah slider berhenti digeser.
  const [settings, setSettings] = useState<Settings>(live);
  const latest = useRef(live);
  latest.current = live;
  useEffect(() => {
    const timer = setTimeout(() => setSettings(latest.current), 250);
    return () => clearTimeout(timer);
  }, [liveKey]);
  const key = settingsKey(settings);

  // Lepas object URL saat tool ditutup.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach(release), []);

  const addFiles = useCallback(async (files: File[]) => {
    const accepted = files.filter(isSvg);
    setFailures(files.filter((file) => !isSvg(file)).map((file) => ({ name: file.name, reason: "bukan file SVG." })));
    if (accepted.length === 0) return;
    setReading({ done: 0, total: accepted.length });
    for (const [i, file] of accepted.entries()) {
      try {
        const source = await readSvg(file);
        const thumbUrl = URL.createObjectURL(new Blob([source.text], { type: "image/svg+xml" }));
        setItems((current) => [...current, { id: crypto.randomUUID(), name: file.name, size: file.size, source, thumbUrl }]);
      } catch (error) {
        setFailures((current) => [...current, { name: file.name, reason: (error as Error).message }]);
      }
      setReading({ done: i + 1, total: accepted.length });
    }
    setReading(null);
  }, []);

  const picker = useFilePicker(ACCEPTED_TYPES.join(","), true, (files) => void addFiles(files));
  const { dropProps, overlay } = usePageFileDrop((files) => void addFiles(files), "Lepaskan untuk menambah SVG");
  usePasteFiles((files) => void addFiles(files));

  // Kode SVG yang ditempel sebagai teks (mis. "Copy as SVG" dari Figma) diperlakukan sebagai file.
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      if ((event.target as HTMLElement).closest("input, textarea") || event.clipboardData?.files.length) return;
      const text = event.clipboardData?.getData("text/plain") ?? "";

      if (!looksLikeSvg(text)) return;
      event.preventDefault();
      void addFiles([new File([text], `tempelan-${fileStamp()}.svg`, { type: "image/svg+xml" })]);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  // Antrean render: satu SVG per putaran. Hasilnya memicu putaran berikutnya.
  const busy = useRef(false);
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    if (busy.current) return;
    const next = items.find((item) => !item.error && item.result?.key !== key);
    if (!next) return;
    busy.current = true;
    const { width, height } = outputSize(next.source, settings.sizing);
    renderSvg(next.source, { format: settings.format, background: settings.background, quality: settings.quality, width, height })
      .then((blob) => {
        const result = { key, blob, url: URL.createObjectURL(blob), width, height };
        setItems((current) => {
          const target = current.find((item) => item.id === next.id);
          if (!target) {
            URL.revokeObjectURL(result.url);
            return current;
          }
          if (target.result) URL.revokeObjectURL(target.result.url);
          return current.map((item) => (item.id === next.id ? { ...item, result } : item));
        });
      })
      .catch((error: Error) => {
        setItems((current) => current.map((item) => (item.id === next.id ? { ...item, error: error.message } : item)));
      })
      .finally(() => {
        busy.current = false;
        // Putaran baru walau daftar tidak berubah (mis. SVG dihapus saat dirender).
        setTurn((n) => n + 1);
      });
  }, [items, key, settings, turn]);

  useEffect(() => setStatus({ kind: "idle" }), [items.length, key]);

  const ext = EXTENSION[settings.format];
  const label = settings.format === "png" ? "PNG" : "JPEG";
  const converted = items.filter((item) => item.result?.key === key);
  const usable = items.filter((item) => !item.error);
  const allReady = usable.length > 0 && converted.length === usable.length;
  const pendingSettings = liveKey !== key;
  const working = Boolean(reading) || !allReady || pendingSettings;
  const anyLimited = items.some((item) => outputSize(item.source, sizing).limited);

  function remove(item: Item) {
    release(item);
    setItems((current) => current.filter((other) => other.id !== item.id));
  }

  function reset() {
    items.forEach(release);
    setItems([]);
    setFailures([]);
  }

  async function downloadAll() {
    if (!allReady) return;
    if (converted.length === 1) {
      const [item] = converted;
      const filename = `${baseName(item.name)}.${ext}`;
      downloadBlob(item.result!.blob, filename);
      return setStatus({ kind: "done", filename, bytes: item.result!.blob.size });
    }
    setStatus({ kind: "zipping" });
    const name = uniqueNamer();
    const zip = await createZip(converted.map((item) => ({ name: name(`${baseName(item.name)}.${ext}`), data: item.result!.blob })));
    const filename = `svg-${ext}-${fileStamp()}.zip`;
    downloadBlob(zip, filename);
    setStatus({ kind: "done", filename, bytes: zip.size });
  }

  return (
    <div className="tool" {...dropProps}>
      <title>SVG ke Gambar · Productivity Tools</title>

      <ToolBar
        title="SVG ke Gambar"
        pill={items.length > 0 ? `${items.length} SVG` : undefined}
        status={
          status.kind === "done" ? (
            <>
              Diunduh <span className="tool-bar__strong">{status.filename}</span>
              <span className="num"> · {formatBytes(status.bytes)}</span>
            </>
          ) : status.kind === "zipping" ? (
            "Menyusun ZIP…"
          ) : undefined
        }
        actions={
          <>
            <button type="button" className="btn" onClick={reset} disabled={items.length === 0}>
              <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
              <span className="hide-sm">Mulai ulang</span>
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={downloadAll}
              disabled={!allReady || pendingSettings || status.kind === "zipping"}
            >
              {items.length > 0 && working ? (
                <LoaderCircle className="spin" size={14} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Download size={14} strokeWidth={2} aria-hidden="true" />
              )}
              {usable.length > 1 ? `Unduh ${usable.length} ${label} (ZIP)` : `Unduh ${label}`}
            </button>
          </>
        }
      />

      <div className="tool-body tool-body--sidebar">
        <aside className="panel" aria-label="Pengaturan">
          <PanelSection title="File SVG" aside={items.length > 0 ? `${items.length} file` : undefined}>
            <FileDropzone
              icon={<FileImage size={20} strokeWidth={1.5} aria-hidden="true" />}
              title="Tambah SVG"
              hint="Bisa banyak sekaligus, diseret, atau ditempel (Ctrl+V), termasuk kode SVG yang disalin."
              onClick={picker.open}
            />
            {reading && (
              <p className="loading-line num" role="status">
                Membaca SVG {reading.done} dari {reading.total}…
              </p>
            )}
            <FailureList failures={failures} onDismiss={() => setFailures([])} />
          </PanelSection>

          <PanelSection title="Format">
            <Segmented label="Simpan sebagai" options={FORMATS} value={format} onChange={setFormat} />
            {format === "jpeg" ? (
              <div className="svg-quality">
                <Slider label="Kualitas JPEG" value={quality} min={50} max={100} display={`${quality}%`} onChange={setQuality} />
              </div>
            ) : (
              <p className="field-note">PNG menjaga tepi tajam dan area transparan. Cocok untuk ikon dan logo.</p>
            )}
          </PanelSection>

          <PanelSection title="Ukuran">
            <Segmented label="Atur dengan" options={SIZE_MODES} value={sizeMode} onChange={setSizeMode} />
            <div className="svg-size">
              {sizeMode === "scale" ? (
                <Segmented label="Kelipatan ukuran asli" options={SCALES} value={scale} onChange={setScale} />
              ) : (
                <NumberInput label="Lebar (px)" value={fixedWidth} min={16} max={16384} onChange={setFixedWidth} />
              )}
            </div>
            <p className="field-note">
              SVG digambar ulang pada ukuran ini, jadi tetap tajam.
              {sizeMode === "width" && " Tinggi mengikuti perbandingan aslinya."}
              {anyLimited && " Gambar yang terlalu besar diperkecil ke batas kanvas browser (16,7 juta piksel)."}
            </p>
          </PanelSection>

          <PanelSection title="Latar">
            {format === "png" ? (
              <ColorSwatches label="Warna latar" options={PNG_BACKGROUNDS} value={pngBackground} onChange={setPngBackground} />
            ) : (
              <>
                <ColorSwatches label="Warna latar" options={JPEG_BACKGROUNDS} value={jpegBackground} onChange={setJpegBackground} />
                <p className="field-note">JPEG tidak mendukung transparansi, jadi area kosong diisi warna ini.</p>
              </>
            )}
          </PanelSection>
        </aside>

        <main className="panel workspace" aria-label="Daftar SVG">
          {items.length === 0 && !reading ? (
            <button type="button" className="workspace__empty" onClick={picker.open}>
              <FileImage size={32} strokeWidth={1.5} aria-hidden="true" />
              <strong>Pilih file SVG</strong>
              <span>Atau seret ke sini, bisa banyak sekaligus. File tidak diunggah ke mana pun.</span>
            </button>
          ) : (
            <>
              <header className="workspace__head">
                <h2>{items.length.toLocaleString("id-ID")} SVG</h2>
                <p className="num" aria-live="polite">
                  {working ? `Mengonversi ${converted.length} dari ${usable.length}…` : `Semua siap diunduh`}
                </p>
              </header>
              <ul className="convert-list">
                {items.map((item) => {
                  const fresh = item.result?.key === key ? item.result : undefined;
                  const out = outputSize(item.source, sizing);
                  return (
                    <li key={item.id} className="convert-row">
                      <span className="convert-row__thumb svg-thumb">
                        <img src={fresh?.url ?? item.thumbUrl} alt="" />
                      </span>
                      <span className="convert-row__name">
                        <span title={item.name}>{item.name}</span>
                        <span className="num">
                          {px(item.source.width)} × {px(item.source.height)} → {px(out.width)} × {px(out.height)} px
                          {!item.source.declared && " · ukuran tidak tertulis di SVG"}
                        </span>
                      </span>
                      <span className="convert-row__size num">
                        {item.error ? (
                          <span className="delta--bad">{item.error}</span>
                        ) : fresh ? (
                          <>
                            <span>{formatBytes(fresh.blob.size)}</span>
                            <span>SVG {formatBytes(item.size)}</span>
                          </>
                        ) : (
                          <>
                            <Bone w={56} h={14} />
                            <span>SVG {formatBytes(item.size)}</span>
                          </>
                        )}
                      </span>
                      <span className="convert-row__actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--icon"
                          disabled={!fresh}
                          onClick={() => fresh && downloadBlob(fresh.blob, `${baseName(item.name)}.${ext}`)}
                          aria-label={`Unduh ${baseName(item.name)}.${ext}`}
                        >
                          <Download size={16} strokeWidth={1.5} />
                        </button>
                        <button type="button" className="btn btn--ghost btn--icon" onClick={() => remove(item)} aria-label={`Hapus ${item.name}`}>
                          <X size={16} strokeWidth={1.5} />
                        </button>
                      </span>
                    </li>
                  );
                })}
                {reading &&
                  Array.from({ length: reading.total - reading.done }, (_, i) => (
                    <li key={`pending-${i}`} className="convert-row" aria-hidden="true">
                      <span className="convert-row__thumb">
                        <Bone w="100%" h="100%" r={0} />
                      </span>
                      <span className="convert-row__name">
                        <Bone w="50%" h={14} />
                      </span>
                    </li>
                  ))}
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

function release(item: Item) {
  URL.revokeObjectURL(item.thumbUrl);
  if (item.result) URL.revokeObjectURL(item.result.url);
}

function px(value: number) {
  return Math.round(value).toLocaleString("id-ID");
}
