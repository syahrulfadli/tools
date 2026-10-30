import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Download, ImagePlus, LoaderCircle, RotateCcw, RotateCw, X } from "lucide-react";
import { Bone } from "../../components/Skeleton";
import { ToolBar } from "../../components/tool/ToolBar";
import { PanelSection, Segmented } from "../../components/tool/controls";
import { FailureList, FileDropzone, type FileFailure } from "../../components/tool/FileDropzone";
import { useFilePicker, usePageFileDrop, usePasteFiles } from "../../components/tool/fileInput";
import { baseName, downloadBlob, fileStamp, formatBytes } from "../../lib/files";
import { ACCEPTED, createPdf, isImage, layoutFor, loadSource, releaseSource, type Quality, type SourceImage } from "./lib/build";
import { PAGE_SIZES, type Orientation, type PageSettings, type PageSizeId, type Rotation } from "./lib/layout";
import "./image-to-pdf.css";

const ORIENTATIONS: { value: Orientation; label: string }[] = [
  { value: "auto", label: "Otomatis" },
  { value: "portrait", label: "Potret" },
  { value: "landscape", label: "Lanskap" },
];

const MARGINS = [
  { value: 0, label: "Tanpa" },
  { value: 5, label: "5 mm" },
  { value: 10, label: "10 mm" },
  { value: 20, label: "20 mm" },
];

const QUALITIES: { value: Quality; label: string }[] = [
  { value: "original", label: "Asli" },
  { value: "balanced", label: "Seimbang" },
  { value: "small", label: "Kecil" },
];

const QUALITY_NOTES: Record<Quality, string> = {
  original: "Kualitas penuh. JPEG dimasukkan apa adanya; PNG dan lainnya tanpa kompresi lossy, termasuk transparansi.",
  balanced: "Gambar diperkecil ke maks. 2.480 px (±300 dpi di A4) dan dikompres JPEG 85%. Cocok untuk dikirim.",
  small: "Gambar diperkecil ke maks. 1.600 px dan dikompres JPEG 70%. Paling ringan, untuk lampiran email/WhatsApp.",
};

type Status =
  | { kind: "idle" }
  | { kind: "building"; done: number; total: number }
  | { kind: "done"; filename: string; bytes: number }
  | { kind: "error"; message: string };

export default function ImageToPdfTool() {
  const [items, setItems] = useState<SourceImage[]>([]);
  const [pageSize, setPageSize] = useState<PageSizeId>("a4");
  const [orientation, setOrientation] = useState<Orientation>("auto");
  const [margin, setMargin] = useState(10);
  const [quality, setQuality] = useState<Quality>("original");
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = useState<FileFailure[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dragId, setDragId] = useState<string | null>(null);
  const settings: PageSettings = { pageSize, orientation, margin };

  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach(releaseSource), []);

  const addFiles = useCallback(async (files: File[]) => {
    const accepted = files.filter(isImage);
    setFailures(files.filter((file) => !isImage(file)).map((file) => ({ name: file.name, reason: "bukan file gambar." })));
    if (!accepted.length) return;
    setLoading({ done: 0, total: accepted.length });
    for (const [i, file] of accepted.entries()) {
      try {
        const source = await loadSource(file);
        setItems((current) => [...current, source]);
      } catch (error) {
        setFailures((current) => [...current, { name: file.name, reason: (error as Error).message }]);
      }
      setLoading({ done: i + 1, total: accepted.length });
    }
    setLoading(null);
  }, []);

  const picker = useFilePicker(ACCEPTED, true, (files) => void addFiles(files));
  const { dropProps, overlay } = usePageFileDrop((files) => void addFiles(files), "Lepaskan untuk menambah gambar");
  usePasteFiles((files) => void addFiles(files));

  useEffect(() => {
    setStatus((current) => (current.kind === "building" ? current : { kind: "idle" }));
  }, [items, pageSize, orientation, margin, quality]);

  const update = (id: string, patch: Partial<SourceImage>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const rotate = (item: SourceImage, delta: 90 | -90) => update(item.id, { rotation: (((item.rotation + delta) % 360) + 360) % 360 as Rotation });
  const move = (from: number, to: number) =>
    setItems((current) => {
      if (to < 0 || to >= current.length || from === to) return current;
      const next = current.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  const remove = (item: SourceImage) => {
    releaseSource(item);
    setItems((current) => current.filter((other) => other.id !== item.id));
  };
  const reset = () => {
    items.forEach(releaseSource);
    setItems([]);
    setFailures([]);
    setFilename("");
  };

  const defaultName = items.length === 1 ? baseName(items[0].name) : `gambar-${fileStamp().slice(0, 8)}`;
  const outputName = `${(filename.trim() || defaultName).replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;

  async function build() {
    if (!items.length) return;
    setStatus({ kind: "building", done: 0, total: items.length });
    try {
      const blob = await createPdf(items, { ...settings, quality }, outputName.replace(/\.pdf$/, ""), (done) =>
        setStatus({ kind: "building", done, total: items.length }),
      );
      downloadBlob(blob, outputName);
      setStatus({ kind: "done", filename: outputName, bytes: blob.size });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message || "PDF gagal dibuat." });
    }
  }

  const building = status.kind === "building";
  const sizeInfo = PAGE_SIZES.find((size) => size.id === pageSize)!;

  return (
    <div className="tool" {...dropProps}>
      <title>Gambar ke PDF · Productivity Tools</title>

      <ToolBar
        title="Gambar ke PDF"
        pill={items.length ? `${items.length} halaman` : undefined}
        status={
          status.kind === "building" ? (
            `Menyusun halaman ${Math.min(status.done + 1, status.total)} dari ${status.total}…`
          ) : status.kind === "done" ? (
            <>
              Diunduh <span className="tool-bar__strong">{status.filename}</span>
              <span className="num"> · {formatBytes(status.bytes)}</span>
            </>
          ) : status.kind === "error" ? (
            <span className="tool-bar__error">{status.message}</span>
          ) : undefined
        }
        actions={
          <>
            <button type="button" className="btn" onClick={reset} disabled={!items.length || building}>
              <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
              <span className="hide-sm">Mulai ulang</span>
            </button>
            <button type="button" className="btn btn--primary" onClick={build} disabled={!items.length || building || Boolean(loading)}>
              {building ? <LoaderCircle className="spin" size={14} strokeWidth={2} aria-hidden="true" /> : <Download size={14} strokeWidth={2} aria-hidden="true" />}
              {building ? <span className="num">{`${status.done}/${status.total}`}</span> : "Buat PDF"}
            </button>
          </>
        }
      />

      <div className="tool-body tool-body--sidebar">
        <aside className="panel" aria-label="Pengaturan">
          <PanelSection title="Gambar" aside={items.length ? `${items.length} file` : undefined}>
            <FileDropzone
              icon={<ImagePlus size={20} strokeWidth={1.5} aria-hidden="true" />}
              title="Tambah gambar"
              hint="JPEG, PNG, WebP, GIF, BMP, AVIF. Satu gambar per halaman. Bisa diseret atau ditempel (Ctrl+V)."
              onClick={picker.open}
            />
            {loading && (
              <p className="loading-line num" role="status">
                Membaca gambar {loading.done} dari {loading.total}…
              </p>
            )}
            <FailureList failures={failures} onDismiss={() => setFailures([])} />
          </PanelSection>

          <PanelSection title="Ukuran kertas" aside={sizeInfo.hint}>
            <div className="chips" role="radiogroup" aria-label="Ukuran kertas">
              {PAGE_SIZES.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  role="radio"
                  aria-checked={pageSize === size.id}
                  className={`chip${pageSize === size.id ? " is-active" : ""}`}
                  onClick={() => setPageSize(size.id)}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </PanelSection>

          <PanelSection title="Tata letak">
            {pageSize === "image" ? (
              <p className="field-note">Tiap halaman seukuran gambarnya (96 dpi), jadi orientasi mengikuti gambar.</p>
            ) : (
              <Segmented label="Orientasi" options={ORIENTATIONS} value={orientation} onChange={setOrientation} />
            )}
            <Segmented label="Margin" options={MARGINS} value={margin} onChange={setMargin} />
            {pageSize !== "image" && orientation === "auto" && (
              <p className="field-note">Otomatis: gambar lebar dapat halaman lanskap, gambar tinggi dapat halaman potret.</p>
            )}
          </PanelSection>

          <PanelSection title="Ukuran file">
            <Segmented label="Kualitas gambar" options={QUALITIES} value={quality} onChange={setQuality} />
            <p className="field-note">{QUALITY_NOTES[quality]}</p>
          </PanelSection>

          <PanelSection title="Nama file">
            <label className="number-field number-field--wide">
              <span className="visually-hidden">Nama file PDF</span>
              <input type="text" value={filename} placeholder={defaultName} onChange={(event) => setFilename(event.target.value)} />
            </label>
            <p className="field-note num">Disimpan sebagai {outputName}</p>
          </PanelSection>
        </aside>

        <main className="panel workspace" aria-label="Halaman PDF">
          {items.length === 0 && !loading ? (
            <button type="button" className="workspace__empty" onClick={picker.open}>
              <ImagePlus size={32} strokeWidth={1.5} aria-hidden="true" />
              <strong>Pilih gambar untuk dijadikan PDF</strong>
              <span>Atau seret ke sini, bisa banyak sekaligus. JPEG, PNG, dan lainnya; gambar tidak diunggah ke mana pun.</span>
            </button>
          ) : (
            <>
              <header className="workspace__head">
                <h2>{items.length.toLocaleString("id-ID")} halaman</h2>
                <p>Seret halaman untuk mengubah urutan.</p>
              </header>
              <ol className="workspace__body pdf-pages">
                {items.map((item, index) => {
                  const page = layoutFor(item, settings);
                  const odd = item.rotation % 180 !== 0;
                  return (
                    <li
                      key={item.id}
                      className={`pdf-page${dragId === item.id ? " is-dragging" : ""}`}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", item.id);
                        setDragId(item.id);
                      }}
                      onDragEnd={() => setDragId(null)}
                      onDragOver={(event) => {
                        if (dragId) event.preventDefault();
                      }}
                      onDrop={(event) => {
                        if (!dragId) return;
                        event.preventDefault();
                        event.stopPropagation();
                        move(items.findIndex((other) => other.id === dragId), index);
                        setDragId(null);
                      }}
                    >
                      <div className="pdf-page__frame">
                        <div className="pdf-page__sheet" style={{ aspectRatio: `${page.width} / ${page.height}` }}>
                          <div
                            className="pdf-page__box"
                            style={{
                              left: `${(page.box.x / page.width) * 100}%`,
                              top: `${(page.box.y / page.height) * 100}%`,
                              width: `${(page.box.width / page.width) * 100}%`,
                              height: `${(page.box.height / page.height) * 100}%`,
                            }}
                          >
                            <img
                              src={item.thumbUrl}
                              alt=""
                              draggable={false}
                              style={{
                                width: odd ? `${(page.box.height / page.box.width) * 100}%` : "100%",
                                height: odd ? `${(page.box.width / page.box.height) * 100}%` : "100%",
                                transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <p className="pdf-page__label">
                        <span className="num">Hal. {index + 1}</span>
                        <span className="pdf-page__name" title={item.name}>
                          {item.name}
                        </span>
                      </p>
                      <div className="pdf-page__actions">
                        <IconButton label={`Putar ${item.name} ke kiri`} onClick={() => rotate(item, -90)}>
                          <RotateCcw size={16} strokeWidth={1.5} />
                        </IconButton>
                        <IconButton label={`Putar ${item.name} ke kanan`} onClick={() => rotate(item, 90)}>
                          <RotateCw size={16} strokeWidth={1.5} />
                        </IconButton>
                        <IconButton label={`Pindahkan ${item.name} ke depan`} disabled={index === 0} onClick={() => move(index, index - 1)}>
                          <ArrowLeft size={16} strokeWidth={1.5} />
                        </IconButton>
                        <IconButton label={`Pindahkan ${item.name} ke belakang`} disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>
                          <ArrowRight size={16} strokeWidth={1.5} />
                        </IconButton>
                        <IconButton label={`Hapus ${item.name}`} onClick={() => remove(item)}>
                          <X size={16} strokeWidth={1.5} />
                        </IconButton>
                      </div>
                    </li>
                  );
                })}
                {loading &&
                  Array.from({ length: loading.total - loading.done }, (_, i) => (
                    <li key={`loading-${i}`} className="pdf-page" aria-hidden="true">
                      <div className="pdf-page__frame">
                        <Bone w="100%" h="auto" r={2} style={{ aspectRatio: "210 / 297" }} />
                      </div>
                      <Bone w="60%" h={12} style={{ marginTop: 10 }} />
                    </li>
                  ))}
              </ol>
            </>
          )}
        </main>
      </div>

      {picker.input}
      {overlay}
    </div>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="btn btn--ghost btn--icon pdf-page__btn" aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
