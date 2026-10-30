import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Download, FileText, FileUp, LoaderCircle, RotateCcw, X } from "lucide-react";
import { Bone } from "../../components/Skeleton";
import { ToolBar } from "../../components/tool/ToolBar";
import { PanelSection } from "../../components/tool/controls";
import { FailureList, FileDropzone, type FileFailure } from "../../components/tool/FileDropzone";
import { useFilePicker, usePageFileDrop, usePasteFiles } from "../../components/tool/fileInput";
import { downloadBlob, fileStamp, formatBytes } from "../../lib/files";
import { loadPdf, mergePdfs, readFile } from "../../lib/pdf-edit";
import { isPdf } from "../compress-pdf/lib/compress";
import { openPdf, pageThumbnail } from "../pdf-to-image/lib/pdf";
import { moveItem } from "./lib/order";
import "./merge-pdf.css";

interface Item {
  id: string;
  file: File;
  /** Diisi setelah PDF diperiksa. */
  pageCount?: number;
  thumb?: string;
  error?: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "merging"; done: number; total: number }
  | { kind: "done"; filename: string; bytes: number }
  | { kind: "error"; message: string };

/** Hitung halaman (pdf-lib, sekaligus menolak PDF terenkripsi/rusak) lalu buat thumbnail halaman 1 (pdf.js). */
async function inspect(file: File): Promise<{ pageCount: number; thumb?: string }> {
  const pageCount = (await loadPdf(await readFile(file))).getPageCount();
  try {
    const pdf = await openPdf(file);
    try {
      return { pageCount, thumb: (await pageThumbnail(pdf, 1, 112)).url };
    } finally {
      void pdf.destroy();
    }
  } catch {
    return { pageCount };
  }
}

export default function MergePdfTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [failures, setFailures] = useState<FileFailure[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const itemsRef = useRef(items);
  itemsRef.current = items;
  // Semua object URL thumbnail yang pernah dibuat; dilepas saat tool ditutup.
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const all = urls.current;
    return () => all.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  // Periksa PDF baru satu per satu (hemat memori); baris yang sudah dihapus dilewati.
  const queue = useRef(Promise.resolve());
  const addFiles = useCallback((files: File[]) => {
    const pdfs = files.filter(isPdf);
    setFailures(files.filter((file) => !isPdf(file)).map((file) => ({ name: file.name, reason: "bukan PDF." })));
    const added: Item[] = pdfs.map((file) => ({ id: crypto.randomUUID(), file }));
    if (added.length === 0) return;
    setItems((current) => [...current, ...added]);
    for (const item of added) {
      queue.current = queue.current.then(async () => {
        if (!itemsRef.current.some((other) => other.id === item.id)) return;
        const patch = await inspect(item.file).catch((error: Error) => ({ error: error.message }));
        if ("thumb" in patch && patch.thumb) urls.current.add(patch.thumb);
        setItems((current) => current.map((other) => (other.id === item.id ? { ...other, ...patch } : other)));
      });
    }
  }, []);

  const picker = useFilePicker("application/pdf,.pdf", true, addFiles);
  const { dropProps, overlay } = usePageFileDrop(addFiles, "Lepaskan untuk menambah PDF");
  usePasteFiles(addFiles);

  useEffect(() => {
    setStatus((current) => (current.kind === "merging" ? current : { kind: "idle" }));
  }, [items]);

  const merging = status.kind === "merging";
  const usable = items.filter((item) => !item.error);
  const inspecting = usable.some((item) => item.pageCount === undefined);
  const canMerge = usable.length >= 2 && !inspecting && !merging;
  const totalPages = usable.reduce((sum, item) => sum + (item.pageCount ?? 0), 0);
  const totalSize = usable.reduce((sum, item) => sum + item.file.size, 0);

  function remove(id: string) {
    setItems((current) => {
      const gone = current.find((item) => item.id === id);
      if (gone?.thumb) {
        URL.revokeObjectURL(gone.thumb);
        urls.current.delete(gone.thumb);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  function reset() {
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current.clear();
    setItems([]);
    setFailures([]);
  }

  async function merge() {
    if (!canMerge) return;
    setStatus({ kind: "merging", done: 0, total: usable.length });
    try {
      const blob = await mergePdfs(
        usable.map((item) => item.file),
        (done, total) => setStatus({ kind: "merging", done, total }),
      );
      const filename = `gabungan-${fileStamp()}.pdf`;
      downloadBlob(blob, filename);
      setStatus({ kind: "done", filename, bytes: blob.size });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    }
  }

  return (
    <div className="tool" {...dropProps}>
      <title>Gabung PDF · Productivity Tools</title>

      <ToolBar
        title="Gabung PDF"
        pill={items.length > 0 ? `${items.length} PDF` : undefined}
        status={
          <>
            {status.kind === "merging" && `Menggabung PDF ${Math.min(status.done + 1, status.total)} dari ${status.total}…`}
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
          <>
            <button type="button" className="btn" onClick={reset} disabled={items.length === 0 || merging}>
              <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
              <span className="hide-sm">Mulai ulang</span>
            </button>
            <button type="button" className="btn btn--primary" onClick={merge} disabled={!canMerge}>
              {merging || inspecting ? (
                <LoaderCircle className="spin" size={14} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Download size={14} strokeWidth={2} aria-hidden="true" />
              )}
              {usable.length >= 2 ? `Gabung ${usable.length} PDF` : "Gabung PDF"}
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

          <PanelSection title="Urutan">
            <p className="field-note">PDF digabung dari atas ke bawah. Pakai panah di tiap baris untuk memindahkan.</p>
          </PanelSection>

          {usable.length > 0 && !inspecting && (
            <PanelSection title="Hasil">
              <dl className="summary num">
                <div>
                  <dt>Jumlah PDF</dt>
                  <dd>{usable.length.toLocaleString("id-ID")}</dd>
                </div>
                <div>
                  <dt>Total halaman</dt>
                  <dd>{totalPages.toLocaleString("id-ID")}</dd>
                </div>
                <div>
                  <dt>Total ukuran asal</dt>
                  <dd>{formatBytes(totalSize)}</dd>
                </div>
              </dl>
            </PanelSection>
          )}
        </aside>

        <main className="panel workspace" aria-label="Daftar PDF">
          {items.length === 0 ? (
            <button type="button" className="workspace__empty" onClick={picker.open}>
              <FileUp size={32} strokeWidth={1.5} aria-hidden="true" />
              <strong>Pilih PDF yang mau digabung</strong>
              <span>Atau seret ke sini, minimal dua file. PDF tidak diunggah ke mana pun.</span>
            </button>
          ) : (
            <>
              <header className="workspace__head">
                <h2>{items.length.toLocaleString("id-ID")} PDF</h2>
                <p className="num" aria-live="polite">
                  {inspecting ? "Memeriksa PDF…" : usable.length < 2 ? "Tambah satu PDF lagi untuk menggabung" : `${totalPages.toLocaleString("id-ID")} halaman setelah digabung`}
                </p>
              </header>
              <ol className="convert-list">
                {items.map((item, index) => (
                  <li key={item.id} className="convert-row merge-row">
                    <span className="convert-row__thumb convert-row__thumb--doc">
                      {item.thumb ? <img src={item.thumb} alt="" /> : item.error ? <FileText size={24} strokeWidth={1.5} aria-hidden="true" /> : <Bone w="100%" h="100%" r={0} />}
                    </span>
                    <span className="convert-row__name">
                      <span title={item.file.name}>
                        <span className="merge-row__index num">{index + 1}.</span> {item.file.name}
                      </span>
                      <span className="num">{item.error ? <span className="delta--bad">{item.error}</span> : item.pageCount === undefined ? "Memeriksa…" : `${item.pageCount.toLocaleString("id-ID")} halaman`}</span>
                    </span>
                    <span className="convert-row__size num">
                      <span>{formatBytes(item.file.size)}</span>
                    </span>
                    <span className="convert-row__actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--icon"
                        disabled={index === 0 || merging}
                        onClick={() => setItems((current) => moveItem(current, index, index - 1))}
                        aria-label={`Naikkan ${item.file.name}`}
                      >
                        <ArrowUp size={16} strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--icon"
                        disabled={index === items.length - 1 || merging}
                        onClick={() => setItems((current) => moveItem(current, index, index + 1))}
                        aria-label={`Turunkan ${item.file.name}`}
                      >
                        <ArrowDown size={16} strokeWidth={1.5} />
                      </button>
                      <button type="button" className="btn btn--ghost btn--icon" disabled={merging} onClick={() => remove(item.id)} aria-label={`Hapus ${item.file.name}`}>
                        <X size={16} strokeWidth={1.5} />
                      </button>
                    </span>
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
