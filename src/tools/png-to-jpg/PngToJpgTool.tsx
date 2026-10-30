import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ImagePlus, LoaderCircle, RotateCcw, X } from "lucide-react";
import { Bone } from "../../components/Skeleton";
import { ToolBar } from "../../components/tool/ToolBar";
import { ColorSwatches, PanelSection, Segmented, Slider } from "../../components/tool/controls";
import { FailureList, FileDropzone, type FileFailure } from "../../components/tool/FileDropzone";
import { useFilePicker, usePageFileDrop, usePasteFiles } from "../../components/tool/fileInput";
import { baseName, downloadBlob, fileStamp, formatBytes, uniqueNamer } from "../../lib/files";
import { createZip } from "../../lib/zip";
import { ACCEPTED_TYPES, decode, isConvertible, sizeChange, targetSize, toJpeg, type ConvertOptions } from "./lib/convert";

interface Item {
  id: string;
  name: string;
  size: number;
  bitmap: ImageBitmap;
  width: number;
  height: number;
  hasAlpha: boolean;
  result?: { key: string; blob: Blob; url: string; width: number; height: number };
  error?: string;
}

const BACKGROUNDS = [
  { value: "#ffffff", label: "Putih" },
  { value: "#000000", label: "Hitam" },
] as const;

const SIZE_OPTIONS = [
  { value: 0, label: "Asli" },
  { value: 4096, label: "4.096" },
  { value: 2048, label: "2.048" },
  { value: 1080, label: "1.080" },
];

const optionsKey = (o: ConvertOptions) => `${o.quality}|${o.background}|${o.maxEdge}`;

export default function PngToJpgTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [quality, setQuality] = useState(90);
  const [background, setBackground] = useState("#ffffff");
  const [maxEdge, setMaxEdge] = useState(0);
  const [decoding, setDecoding] = useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = useState<FileFailure[]>([]);
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "zipping" } | { kind: "done"; filename: string; bytes: number }>({
    kind: "idle",
  });

  // Pengaturan yang dipakai konversi diperbarui 250 ms setelah slider berhenti digeser.
  const [options, setOptions] = useState<ConvertOptions>({ quality: 0.9, background, maxEdge });
  useEffect(() => {
    const timer = setTimeout(() => setOptions({ quality: quality / 100, background, maxEdge }), 250);
    return () => clearTimeout(timer);
  }, [quality, background, maxEdge]);
  const key = optionsKey(options);

  // Lepas bitmap dan object URL saat tool ditutup.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach(release), []);

  const addFiles = useCallback(async (files: File[]) => {
    const accepted = files.filter(isConvertible);
    setFailures(
      files
        .filter((file) => !isConvertible(file))
        .map((file) => ({ name: file.name, reason: "bukan PNG, WebP, GIF, BMP, atau AVIF." })),
    );
    if (accepted.length === 0) return;
    setDecoding({ done: 0, total: accepted.length });
    for (const [i, file] of accepted.entries()) {
      try {
        const decoded = await decode(file);
        setItems((current) => [...current, { id: crypto.randomUUID(), name: file.name, size: file.size, ...decoded }]);
      } catch (error) {
        setFailures((current) => [...current, { name: file.name, reason: (error as Error).message }]);
      }
      setDecoding({ done: i + 1, total: accepted.length });
    }
    setDecoding(null);
  }, []);

  const picker = useFilePicker(ACCEPTED_TYPES.join(","), true, (files) => void addFiles(files));
  const { dropProps, overlay } = usePageFileDrop((files) => void addFiles(files), "Lepaskan untuk menambah gambar");
  usePasteFiles((files) => void addFiles(files));

  // Antrean konversi: satu gambar per putaran. Hasilnya memicu putaran berikutnya.
  const busy = useRef(false);
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    if (busy.current) return;
    const next = items.find((item) => !item.error && item.result?.key !== key);
    if (!next) return;
    busy.current = true;
    toJpeg(next.bitmap, options)
      .then(({ blob, width, height }) => {
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
        // Putaran baru walau daftar tidak berubah (mis. gambar dihapus saat dikonversi).
        setTurn((n) => n + 1);
      });
  }, [items, key, options, turn]);

  useEffect(() => setStatus({ kind: "idle" }), [items.length, key]);

  const converted = items.filter((item) => item.result?.key === key);
  const usable = items.filter((item) => !item.error);
  const allReady = usable.length > 0 && converted.length === usable.length;
  const pendingSettings = optionsKey({ quality: quality / 100, background, maxEdge }) !== key;
  const totalBefore = converted.reduce((sum, item) => sum + item.size, 0);
  const totalAfter = converted.reduce((sum, item) => sum + item.result!.blob.size, 0);
  const anyAlpha = items.some((item) => item.hasAlpha);

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
      const filename = `${baseName(item.name)}.jpg`;
      downloadBlob(item.result!.blob, filename);
      return setStatus({ kind: "done", filename, bytes: item.result!.blob.size });
    }
    setStatus({ kind: "zipping" });
    const name = uniqueNamer();
    const zip = await createZip(converted.map((item) => ({ name: name(`${baseName(item.name)}.jpg`), data: item.result!.blob })));
    const filename = `jpeg-${fileStamp()}.zip`;
    downloadBlob(zip, filename);
    setStatus({ kind: "done", filename, bytes: zip.size });
  }

  const working = Boolean(decoding) || !allReady || pendingSettings;

  return (
    <div className="tool" {...dropProps}>
      <title>PNG ke JPEG · Productivity Tools</title>

      <ToolBar
        title="PNG ke JPEG"
        pill={items.length > 0 ? `${items.length} gambar` : undefined}
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
              {usable.length > 1 ? `Unduh ${usable.length} JPEG (ZIP)` : "Unduh JPEG"}
            </button>
          </>
        }
      />

      <div className="tool-body tool-body--sidebar">
        <aside className="panel" aria-label="Pengaturan">
          <PanelSection title="Gambar" aside={items.length > 0 ? `${items.length} file` : undefined}>
            <FileDropzone
              icon={<ImagePlus size={20} strokeWidth={1.5} aria-hidden="true" />}
              title="Tambah gambar"
              hint="PNG, juga WebP, GIF (bingkai pertama), BMP, AVIF. Bisa diseret atau ditempel (Ctrl+V)."
              onClick={picker.open}
            />
            {decoding && (
              <p className="loading-line num" role="status">
                Membaca gambar {decoding.done} dari {decoding.total}…
              </p>
            )}
            <FailureList failures={failures} onDismiss={() => setFailures([])} />
          </PanelSection>

          <PanelSection title="Kualitas JPEG">
            <Slider label="Kualitas" value={quality} min={50} max={100} display={`${quality}%`} onChange={setQuality} />
            <p className="field-note">Makin tinggi makin tajam, tapi file makin besar. 85–92% biasanya pas.</p>
          </PanelSection>

          <PanelSection title="Latar area transparan">
            <ColorSwatches label="Warna latar" options={BACKGROUNDS} value={background} onChange={setBackground} />
            <p className="field-note">
              JPEG tidak mendukung transparansi.
              {items.length > 0 && (anyAlpha ? " Area transparan di gambarmu akan diisi warna ini." : " Gambarmu tidak punya area transparan.")}
            </p>
          </PanelSection>

          <PanelSection title="Ukuran">
            <Segmented label="Sisi terpanjang maksimum (px)" options={SIZE_OPTIONS} value={maxEdge} onChange={setMaxEdge} />
            <p className="field-note">Gambar yang lebih kecil dari batas ini tidak diperbesar.</p>
          </PanelSection>

          {converted.length > 0 && (
            <PanelSection title="Total">
              <dl className="summary num">
                <div>
                  <dt>Ukuran asli</dt>
                  <dd>{formatBytes(totalBefore)}</dd>
                </div>
                <div>
                  <dt>Setelah jadi JPEG</dt>
                  <dd>{formatBytes(totalAfter)}</dd>
                </div>
                <div>
                  <dt>Selisih</dt>
                  <dd className={totalAfter <= totalBefore ? "delta--good" : "delta--bad"}>{signed(sizeChange(totalBefore, totalAfter))}%</dd>
                </div>
              </dl>
            </PanelSection>
          )}
        </aside>

        <main className="panel workspace" aria-label="Daftar gambar">
          {items.length === 0 && !decoding ? (
            <button type="button" className="workspace__empty" onClick={picker.open}>
              <ImagePlus size={32} strokeWidth={1.5} aria-hidden="true" />
              <strong>Pilih gambar PNG</strong>
              <span>Atau seret ke sini, bisa banyak sekaligus. Gambar tidak diunggah ke mana pun.</span>
            </button>
          ) : (
            <>
              <header className="workspace__head">
                <h2>
                  {items.length.toLocaleString("id-ID")} gambar
                </h2>
                <p className="num" aria-live="polite">
                  {working ? `Mengonversi ${converted.length} dari ${usable.length}…` : `Semua siap diunduh`}
                </p>
              </header>
              <ul className="convert-list">
                {items.map((item) => {
                  const fresh = item.result?.key === key ? item.result : undefined;
                  const out = targetSize(item.width, item.height, maxEdge);
                  const resized = out.width !== item.width || out.height !== item.height;
                  const change = fresh ? sizeChange(item.size, fresh.blob.size) : 0;
                  return (
                    <li key={item.id} className="convert-row">
                      <span className="convert-row__thumb">
                        {fresh ? <img src={fresh.url} alt="" /> : item.error ? null : <Bone w="100%" h="100%" r={0} />}
                      </span>
                      <span className="convert-row__name">
                        <span title={item.name}>{item.name}</span>
                        <span className="num">
                          {item.width.toLocaleString("id-ID")} × {item.height.toLocaleString("id-ID")} px
                          {resized && ` → ${out.width.toLocaleString("id-ID")} × ${out.height.toLocaleString("id-ID")} px`}
                          {item.hasAlpha && " · ada transparansi"}
                        </span>
                      </span>
                      <span className="convert-row__size num">
                        {item.error ? (
                          <span className="delta--bad">{item.error}</span>
                        ) : fresh ? (
                          <>
                            <span>{formatBytes(fresh.blob.size)}</span>
                            <span>
                              dari {formatBytes(item.size)} ·{" "}
                              <span className={change <= 0 ? "delta--good" : "delta--bad"}>{signed(change)}%</span>
                            </span>
                          </>
                        ) : (
                          <>
                            <Bone w={56} h={14} />
                            <span>dari {formatBytes(item.size)}</span>
                          </>
                        )}
                      </span>
                      <span className="convert-row__actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--icon"
                          disabled={!fresh}
                          onClick={() => fresh && downloadBlob(fresh.blob, `${baseName(item.name)}.jpg`)}
                          aria-label={`Unduh ${baseName(item.name)}.jpg`}
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
                {decoding &&
                  Array.from({ length: decoding.total - decoding.done }, (_, i) => (
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
  item.bitmap.close();
  if (item.result) URL.revokeObjectURL(item.result.url);
}

function signed(value: number) {
  return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0";
}
