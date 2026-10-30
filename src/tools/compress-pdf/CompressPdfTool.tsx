import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, FileUp, LoaderCircle, RotateCcw, X } from "lucide-react";
import { Bone } from "../../components/Skeleton";
import { ToolBar } from "../../components/tool/ToolBar";
import { PanelSection, Segmented } from "../../components/tool/controls";
import { FailureList, FileDropzone, type FileFailure } from "../../components/tool/FileDropzone";
import { useFilePicker, usePageFileDrop, usePasteFiles } from "../../components/tool/fileInput";
import { downloadBlob, fileStamp, formatBytes, uniqueNamer } from "../../lib/files";
import { createZip } from "../../lib/zip";
import { sizeChange } from "../png-to-jpg/lib/convert";
import { compressPdf, isPdf, outputName, type PdfResult } from "./lib/compress";
import type { Level, Mode } from "./lib/levels";
import "./compress-pdf.css";

interface Item {
  id: string;
  file: File;
  name: string;
  size: number;
  result?: PdfResult & { key: string };
  error?: string;
}

const MODES: { value: Mode; label: string }[] = [
  { value: "images", label: "Kompres gambar" },
  { value: "flatten", label: "Ratakan jadi gambar" },
];

const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: "high", label: "Tinggi" },
  { value: "balanced", label: "Seimbang" },
  { value: "small", label: "Terkecil" },
];

const MODE_NOTES: Record<Mode, string> = {
  images:
    "Hanya gambar JPEG di dalam PDF yang dikecilkan. Teks, tautan, dan susunan halaman tetap sama, jadi teks masih bisa dipilih. Cocok untuk PDF berisi foto atau hasil scan.",
  flatten:
    "Setiap halaman dijadikan satu gambar. Paling kecil untuk PDF hasil scan, tapi teks tidak bisa lagi dipilih atau dicari, dan PDF yang isinya teks saja bisa jadi lebih besar.",
};

const keyOf = (mode: Mode, level: Level) => `${mode}|${level}`;
const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0");

export default function CompressPdfTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<Mode>("images");
  const [level, setLevel] = useState<Level>("balanced");
  const [failures, setFailures] = useState<FileFailure[]>([]);
  const [active, setActive] = useState<{ id: string; done: number; total: number } | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "zipping" } | { kind: "done"; filename: string; bytes: number }>({ kind: "idle" });
  const key = keyOf(mode, level);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const addFiles = useCallback((files: File[]) => {
    const pdfs = files.filter(isPdf);
    setFailures(files.filter((file) => !isPdf(file)).map((file) => ({ name: file.name, reason: "bukan PDF." })));
    setItems((current) => [...current, ...pdfs.map((file) => ({ id: crypto.randomUUID(), file, name: file.name, size: file.size }))]);
  }, []);

  const picker = useFilePicker("application/pdf,.pdf", true, addFiles);
  const { dropProps, overlay } = usePageFileDrop(addFiles, "Lepaskan untuk menambah PDF");
  usePasteFiles(addFiles);

  // Antrean: satu PDF per putaran, karena kompres memakai banyak memori. Selesai → putaran berikutnya.
  const busy = useRef(false);
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    if (busy.current) return;
    const next = items.find((item) => !item.error && item.result?.key !== key);
    if (!next) return;
    busy.current = true;
    const [runMode, runLevel] = key.split("|") as [Mode, Level];
    setActive({ id: next.id, done: 0, total: 0 });
    compressPdf(
      next.file,
      runMode,
      runLevel,
      (done, total) => setActive({ id: next.id, done, total }),
      () => !itemsRef.current.some((item) => item.id === next.id),
    )
      .then((result) => setItems((current) => current.map((item) => (item.id === next.id ? { ...item, result: { ...result, key } } : item))))
      .catch((error: Error) => setItems((current) => current.map((item) => (item.id === next.id ? { ...item, error: error.message } : item))))
      .finally(() => {
        busy.current = false;
        setActive(null);
        setTurn((n) => n + 1);
      });
  }, [items, key, turn]);

  useEffect(() => setStatus({ kind: "idle" }), [items.length, key]);

  const converted = items.filter((item) => item.result?.key === key);
  const usable = items.filter((item) => !item.error);
  const allReady = usable.length > 0 && converted.length === usable.length;
  const totalBefore = converted.reduce((sum, item) => sum + item.size, 0);
  const totalAfter = converted.reduce((sum, item) => sum + item.result!.blob.size, 0);

  function reset() {
    setItems([]);
    setFailures([]);
  }

  async function downloadAll() {
    if (!allReady) return;
    if (converted.length === 1) {
      const [item] = converted;
      const filename = outputName(item.name);
      downloadBlob(item.result!.blob, filename);
      return setStatus({ kind: "done", filename, bytes: item.result!.blob.size });
    }
    setStatus({ kind: "zipping" });
    const name = uniqueNamer();
    const zip = await createZip(converted.map((item) => ({ name: name(outputName(item.name)), data: item.result!.blob })));
    const filename = `pdf-kompres-${fileStamp()}.zip`;
    downloadBlob(zip, filename);
    setStatus({ kind: "done", filename, bytes: zip.size });
  }

  return (
    <div className="tool" {...dropProps}>
      <title>Kompres PDF · Productivity Tools</title>

      <ToolBar
        title="Kompres PDF"
        pill={items.length > 0 ? `${items.length} PDF` : undefined}
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
            <button type="button" className="btn btn--primary" onClick={downloadAll} disabled={!allReady || status.kind === "zipping"}>
              {items.length > 0 && !allReady ? (
                <LoaderCircle className="spin" size={14} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Download size={14} strokeWidth={2} aria-hidden="true" />
              )}
              {usable.length > 1 ? `Unduh ${usable.length} PDF (ZIP)` : "Unduh PDF"}
            </button>
          </>
        }
      />

      <div className="tool-body tool-body--sidebar">
        <aside className="panel" aria-label="Pengaturan">
          <PanelSection title="PDF" aside={items.length > 0 ? `${items.length} file` : undefined}>
            <FileDropzone
              icon={<FileUp size={20} strokeWidth={1.5} aria-hidden="true" />}
              title="Tambah PDF"
              hint="Bisa banyak sekaligus, diseret, atau ditempel (Ctrl+V). PDF berkata sandi belum didukung."
              onClick={picker.open}
            />
            <FailureList failures={failures} onDismiss={() => setFailures([])} />
          </PanelSection>

          <PanelSection title="Cara kompres">
            <Segmented label="Cara kompres" options={MODES} value={mode} onChange={setMode} />
            <p className="field-note">{MODE_NOTES[mode]}</p>
          </PanelSection>

          <PanelSection title="Tingkat kompresi">
            <Segmented label="Tingkat" options={LEVEL_OPTIONS} value={level} onChange={setLevel} />
            <p className="field-note">Makin kecil ukuran, makin turun ketajaman gambar. Seimbang cukup untuk dibaca di layar.</p>
          </PanelSection>

          {converted.length > 0 && (
            <PanelSection title="Total">
              <dl className="summary num">
                <div>
                  <dt>Ukuran asli</dt>
                  <dd>{formatBytes(totalBefore)}</dd>
                </div>
                <div>
                  <dt>Setelah dikompres</dt>
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

        <main className="panel workspace" aria-label="Daftar PDF">
          {items.length === 0 ? (
            <button type="button" className="workspace__empty" onClick={picker.open}>
              <FileUp size={32} strokeWidth={1.5} aria-hidden="true" />
              <strong>Pilih PDF</strong>
              <span>Atau seret ke sini, bisa banyak sekaligus. PDF tidak diunggah ke mana pun.</span>
            </button>
          ) : (
            <>
              <header className="workspace__head">
                <h2>{items.length.toLocaleString("id-ID")} PDF</h2>
                <p className="num" aria-live="polite">
                  {allReady ? "Semua siap diunduh" : `Mengompres ${converted.length} dari ${usable.length}…`}
                </p>
              </header>
              <ul className="convert-list">
                {items.map((item) => {
                  const fresh = item.result?.key === key ? item.result : undefined;
                  const progress = active?.id === item.id && active.total > 0 ? active : undefined;
                  const change = fresh ? sizeChange(item.size, fresh.blob.size) : 0;
                  return (
                    <li key={item.id} className="convert-row">
                      <span className="convert-row__thumb convert-row__thumb--doc">
                        <FileText size={24} strokeWidth={1.5} aria-hidden="true" />
                      </span>
                      <span className="convert-row__name">
                        <span title={item.name}>{item.name}</span>
                        <span className="num">{fresh ? fresh.detail : progress ? `Memproses ${progress.done} dari ${progress.total}…` : "Menunggu"}</span>
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
                          <span className="convert-row__progress">
                            <Bone w={56} h={14} />
                            <span>dari {formatBytes(item.size)}</span>
                          </span>
                        )}
                      </span>
                      <span className="convert-row__actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--icon"
                          disabled={!fresh}
                          onClick={() => fresh && downloadBlob(fresh.blob, outputName(item.name))}
                          aria-label={`Unduh ${outputName(item.name)}`}
                        >
                          <Download size={16} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--icon"
                          onClick={() => setItems((current) => current.filter((other) => other.id !== item.id))}
                          aria-label={`Hapus ${item.name}`}
                        >
                          <X size={16} strokeWidth={1.5} />
                        </button>
                      </span>
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
