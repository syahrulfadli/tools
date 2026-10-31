import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Copy, Download, LoaderCircle, RotateCcw } from "lucide-react";
import { ToolBar } from "../../components/tool/ToolBar";
import type { FileFailure } from "../../components/tool/FileDropzone";
import { useFilePicker, usePageFileDrop, usePasteFiles } from "../../components/tool/fileInput";
import { downloadBlob, formatBytes } from "../../lib/files";
import { CollageCanvas } from "./components/CollageCanvas";
import { PhotosPanel } from "./components/PhotosPanel";
import { ExportSection, SettingsPanel } from "./components/SettingsPanel";
import { isImageFile, loadPhoto, releasePhoto, type Photo } from "./lib/images";
import { collageFilename, renderCollage } from "./lib/render";
import { loadSettings, saveSettings } from "./lib/persist";
import { collageReducer, initialState } from "./lib/state";
import "./collage.css";

type ExportStatus =
  | { kind: "idle" }
  | { kind: "rendering" }
  | { kind: "copying" }
  | { kind: "done"; filename: string; width: number; height: number; bytes: number }
  | { kind: "copied" }
  | { kind: "error"; message: string };

export default function CollageTool() {
  // Mulai dengan setelan terakhir yang tersimpan di browser ini.
  const [state, dispatch] = useReducer(collageReducer, undefined, () => initialState(loadSettings()));
  const [pending, setPending] = useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = useState<FileFailure[]>([]);
  const [status, setStatus] = useState<ExportStatus>({ kind: "idle" });
  const pickTarget = useRef<number | undefined>(undefined);

  const photoById = useMemo(() => new Map(state.photos.map((photo) => [photo.id, photo])), [state.photos]);
  const filled = state.cells.filter((cell) => cell.photoId).length;

  // Simpan setelan setelah berhenti diubah sebentar (slider tidak menulis tiap piksel),
  // dan langsung saat tool ditutup atau halaman ditinggalkan agar perubahan terakhir tidak hilang.
  const settingsRef = useRef(state.settings);
  settingsRef.current = state.settings;
  useEffect(() => {
    const timer = setTimeout(() => saveSettings(state.settings), 300);
    return () => clearTimeout(timer);
  }, [state.settings]);
  useEffect(() => {
    const flush = () => saveSettings(settingsRef.current);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  // Lepas semua object URL saat tool ditutup: tidak ada sisa foto di memori.
  const photosRef = useRef(state.photos);
  photosRef.current = state.photos;
  useEffect(() => () => photosRef.current.forEach(releasePhoto), []);

  const addFiles = useCallback(async (files: File[], target?: number) => {
    const images = files.filter(isImageFile);
    const rejected = files
      .filter((file) => !isImageFile(file))
      .map((file) => ({ name: file.name, reason: "bukan file gambar." }));
    setFailures(rejected);
    if (images.length === 0) return;

    setPending({ done: 0, total: images.length });
    const loaded: Photo[] = [];
    const failed: FileFailure[] = [];
    // Dimuat berurutan agar progres terlihat dan memori tidak melonjak untuk foto besar.
    for (const [i, file] of images.entries()) {
      try {
        loaded.push(await loadPhoto(file));
      } catch (error) {
        failed.push({ name: file.name, reason: (error as Error).message });
      }
      setPending({ done: i + 1, total: images.length });
    }
    setPending(null);
    if (failed.length) setFailures((current) => [...current, ...failed]);
    if (loaded.length) dispatch({ type: "addPhotos", photos: loaded, target });
  }, []);

  const picker = useFilePicker("image/*", true, (files) => {
    void addFiles(files, pickTarget.current);
    pickTarget.current = undefined;
  });
  const { dropProps, overlay } = usePageFileDrop((files) => void addFiles(files), "Lepaskan untuk menambah foto");
  // Tempelan masuk ke sel terpilih bila ada.
  usePasteFiles((files) => void addFiles(files, state.selected ?? undefined));

  function openPicker(target?: number) {
    pickTarget.current = target;
    picker.open();
  }

  function removePhoto(photo: Photo) {
    dispatch({ type: "removePhoto", photoId: photo.id });
    releasePhoto(photo);
  }

  function reset() {
    state.photos.forEach(releasePhoto);
    dispatch({ type: "reset" });
    setFailures([]);
    setStatus({ kind: "idle" });
  }

  function renderCells() {
    return state.cells.map((cell) => {
      const photo = cell.photoId ? photoById.get(cell.photoId) : undefined;
      return photo ? { image: photo.image, framing: cell.framing } : null;
    });
  }

  async function exportCollage() {
    setStatus({ kind: "rendering" });
    try {
      const { blob, width, height } = await renderCollage(state.settings, renderCells());
      const filename = collageFilename(state.settings);
      downloadBlob(blob, filename);
      setStatus({ kind: "done", filename, width, height, bytes: blob.size });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    }
  }

  async function copyCollage() {
    setStatus({ kind: "copying" });
    try {
      // ClipboardItem menerima promise, sehingga izin menulis tetap terikat ke klik user (Safari).
      const png = renderCollage(state.settings, renderCells(), "image/png").then((result) => result.blob);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      setStatus({ kind: "copied" });
    } catch {
      setStatus({ kind: "error", message: "Browser ini belum bisa menyalin gambar. Unduh saja." });
    }
  }

  // Setelan apa pun yang berubah membuat status unduhan lama tidak relevan.
  useEffect(() => {
    setStatus((current) =>
      current.kind === "done" || current.kind === "copied" || current.kind === "error" ? { kind: "idle" } : current,
    );
  }, [state.settings, state.cells]);

  const busy = status.kind === "rendering" || status.kind === "copying";
  const formatLabel = state.settings.format === "jpeg" ? "JPG" : "PNG";

  return (
    <div className="tool" {...dropProps}>
      <title>Kolase Foto · Productivity Tools</title>

      <ToolBar
        title="Kolase Foto"
        pill={`${filled} dari ${state.cells.length} sel terisi`}
        status={
          <>
            {status.kind === "copied" && "Kolase disalin ke clipboard"}
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
            <button type="button" className="btn" onClick={reset} disabled={state.photos.length === 0}>
              <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
              <span className="hide-sm">Mulai ulang</span>
            </button>
            <button type="button" className="btn" onClick={copyCollage} disabled={filled === 0 || busy}>
              {status.kind === "copying" ? (
                <LoaderCircle className="spin" size={14} strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Copy size={14} strokeWidth={1.5} aria-hidden="true" />
              )}
              <span className="hide-sm">Salin gambar</span>
            </button>
            <button type="button" className="btn btn--primary" onClick={exportCollage} disabled={filled === 0 || busy}>
              {status.kind === "rendering" ? (
                <LoaderCircle className="spin" size={14} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Download size={14} strokeWidth={2} aria-hidden="true" />
              )}
              {status.kind === "rendering" ? "Merender…" : `Unduh ${formatLabel}`}
            </button>
          </>
        }
      />

      <div className="tool-body collage__body">
        <SettingsPanel settings={state.settings} dispatch={dispatch} />
        <CollageCanvas
          state={state}
          photoById={photoById}
          dispatch={dispatch}
          onPickForCell={openPicker}
          onDropFiles={(files, cell) => void addFiles(files, cell)}
        />
        <PhotosPanel
          state={state}
          photoById={photoById}
          dispatch={dispatch}
          pending={pending}
          failures={failures}
          onDismissFailures={() => setFailures([])}
          onAdd={() => openPicker()}
          onRemove={removePhoto}
        >
          <ExportSection settings={state.settings} dispatch={dispatch} />
        </PhotosPanel>
      </div>

      {picker.input}
      {overlay}
    </div>
  );
}
