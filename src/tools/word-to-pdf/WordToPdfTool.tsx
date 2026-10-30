import { useCallback, useEffect, useRef, useState } from "react";
import { FilePlus2, FileText, LoaderCircle, Printer } from "lucide-react";
import { Bone } from "../../components/Skeleton";
import { ToolBar } from "../../components/tool/ToolBar";
import { PanelSection } from "../../components/tool/controls";
import { FailureList, FileDropzone, type FileFailure } from "../../components/tool/FileDropzone";
import { useFilePicker, usePageFileDrop, usePasteFiles } from "../../components/tool/fileInput";
import { baseName, formatBytes } from "../../lib/files";
import { describePage, type PageSize } from "./lib/pages";
import { ACCEPTED, FRAME_SRCDOC, clearDocx, fitZoom, isDocx, printFrame, rejectReason, renderDocx } from "./lib/render";
import "./word-to-pdf.css";

type Doc =
  | { phase: "empty" }
  | { phase: "opening"; file: File }
  | { phase: "ready"; file: File; pages: PageSize[]; sheets: number }
  | { phase: "error"; file: File; message: string };

/** Token warna aplikasi yang dipakai gaya pratinjau di dalam iframe. */
const FRAME_TOKENS = ["--well", "--border"];

export default function WordToPdfTool() {
  const [doc, setDoc] = useState<Doc>({ phase: "empty" });
  const [filename, setFilename] = useState("");
  const [failures, setFailures] = useState<FileFailure[]>([]);
  const [printing, setPrinting] = useState(false);

  const frameRef = useRef<HTMLIFrameElement>(null);
  // Iframe srcdoc siap ditulisi setelah event load pertamanya.
  const frameLoaded = useRef<(doc: Document) => void>(() => {});
  const frameReady = useRef<Promise<Document> | null>(null);
  frameReady.current ??= new Promise((resolve) => (frameLoaded.current = resolve));
  useEffect(() => {
    const frame = frameRef.current!;
    const done = () => frameLoaded.current(frame.contentDocument!);
    if (frame.contentDocument?.getElementById("docx-root")) done();
    frame.addEventListener("load", done);
    return () => frame.removeEventListener("load", done);
  }, []);

  // Render berurutan; hasil file yang sudah diganti dibuang lewat token.
  const openToken = useRef(0);
  const queue = useRef(Promise.resolve());
  const open = useCallback((file: File) => {
    const token = ++openToken.current;
    setDoc({ phase: "opening", file });
    queue.current = queue.current.then(async () => {
      if (token !== openToken.current) return;
      try {
        const rendered = await renderDocx(file, await frameReady.current!);
        if (token === openToken.current) setDoc({ phase: "ready", file, ...rendered });
      } catch (error) {
        if (token === openToken.current) setDoc({ phase: "error", file, message: (error as Error).message });
      }
    });
  }, []);

  const addFiles = useCallback(
    (files: File[]) => {
      const docx = files.find(isDocx);
      const rejected = files.filter((file) => !isDocx(file)).map((file) => ({ name: file.name, reason: rejectReason(file) }));
      const extra = files.filter((file) => isDocx(file) && file !== docx).map((file) => ({ name: file.name, reason: "dilewati, satu dokumen sekaligus." }));
      setFailures([...rejected, ...extra]);
      if (docx) {
        setFilename("");
        open(docx);
      }
    },
    [open],
  );

  const picker = useFilePicker(ACCEPTED, false, addFiles);
  const { dropProps, overlay } = usePageFileDrop(addFiles, "Lepaskan untuk membuka dokumen");
  usePasteFiles(addFiles);

  // Zoom pratinjau mengikuti lebar area kerja.
  const ready = doc.phase === "ready";
  const pages = ready ? doc.pages : null;
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !pages) return;
    const observer = new ResizeObserver(() => fitZoom(frame.contentDocument!, pages, frame.clientWidth));
    observer.observe(frame);
    return () => observer.disconnect();
  }, [pages]);

  // Warna latar dan garis halaman di iframe ikut tema terang/gelap aplikasi.
  useEffect(() => {
    const sync = () => {
      void frameReady.current!.then((frameDoc) => {
        const app = getComputedStyle(document.documentElement);
        for (const token of FRAME_TOKENS) frameDoc.documentElement.style.setProperty(token, app.getPropertyValue(token).trim());
      });
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const reset = () => {
    openToken.current++;
    setDoc({ phase: "empty" });
    setFailures([]);
    setFilename("");
    void frameReady.current!.then(clearDocx);
  };

  const defaultName = doc.phase === "empty" ? "dokumen" : baseName(doc.file.name);
  const outputName = (filename.trim() || defaultName).replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, "-");

  function print() {
    if (!ready || !frameRef.current) return;
    setPrinting(true);
    // Beri waktu status tampil; di Chrome print() menahan halaman sampai dialog ditutup.
    setTimeout(() => {
      try {
        printFrame(frameRef.current!, outputName);
      } finally {
        setPrinting(false);
      }
    }, 50);
  }

  const sizes = pages ? [...new Set(pages.map(describePage))] : [];
  const pageInfo = sizes.length > 2 ? `${sizes.length} ukuran halaman` : sizes.join(", ");

  return (
    <div className="tool" {...dropProps}>
      <title>Word ke PDF · Productivity Tools</title>

      <ToolBar
        title="Word ke PDF"
        pill={ready ? `${doc.sheets.toLocaleString("id-ID")} halaman` : undefined}
        status={
          doc.phase === "opening" ? (
            "Membuka dokumen…"
          ) : printing ? (
            "Membuka dialog cetak…"
          ) : doc.phase === "error" ? (
            <span className="tool-bar__error">{doc.message}</span>
          ) : undefined
        }
        actions={
          <button type="button" className="btn btn--primary" onClick={print} disabled={!ready || printing}>
            {doc.phase === "opening" || printing ? (
              <LoaderCircle className="spin" size={14} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Printer size={14} strokeWidth={2} aria-hidden="true" />
            )}
            Simpan PDF
          </button>
        }
      />

      <div className="tool-body tool-body--sidebar">
        <aside className="panel" aria-label="Pengaturan">
          <PanelSection title="Dokumen" aside={doc.phase !== "empty" ? formatBytes(doc.file.size) : undefined}>
            {doc.phase === "empty" ? (
              <FileDropzone
                icon={<FilePlus2 size={20} strokeWidth={1.5} aria-hidden="true" />}
                title="Pilih file Word"
                hint="Satu file .docx. Bisa juga diseret ke halaman ini."
                onClick={picker.open}
              />
            ) : (
              <div className="doc-card">
                <FileText size={20} strokeWidth={1.5} aria-hidden="true" />
                <p>
                  <span className="doc-card__name" title={doc.file.name}>
                    {doc.file.name}
                  </span>
                  <span className="num">
                    {ready ? pageInfo : doc.phase === "opening" ? "Membuka…" : "Tidak bisa dibuka"}
                  </span>
                </p>
                <div className="button-row">
                  <button type="button" className="btn" onClick={picker.open}>
                    Ganti file
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={reset}>
                    Tutup
                  </button>
                </div>
              </div>
            )}
            <FailureList failures={failures} onDismiss={() => setFailures([])} />
          </PanelSection>

          <PanelSection title="Simpan sebagai PDF">
            <ol className="word-steps">
              <li>
                Klik <strong>Simpan PDF</strong>. Dialog cetak browser terbuka.
              </li>
              <li>
                Pilih tujuan <strong>Simpan sebagai PDF</strong>. Di iPhone/iPad, pakai tombol Bagikan lalu Simpan ke File.
              </li>
              <li>Biarkan margin Default dan skala 100%; ukuran kertas sudah mengikuti dokumen.</li>
            </ol>
            <p className="field-note">Teks di PDF tetap bisa dipilih dan dicari, tidak berubah jadi gambar.</p>
          </PanelSection>

          <PanelSection title="Nama file">
            <label className="number-field number-field--wide">
              <span className="visually-hidden">Nama file PDF</span>
              <input type="text" value={filename} placeholder={defaultName} onChange={(event) => setFilename(event.target.value)} />
            </label>
            <p className="field-note num">Diusulkan sebagai {outputName}.pdf di dialog cetak.</p>
          </PanelSection>
        </aside>

        <main className="panel workspace" aria-label="Pratinjau dokumen">
          {doc.phase === "empty" && (
            <button type="button" className="workspace__empty" onClick={picker.open}>
              <FileText size={32} strokeWidth={1.5} aria-hidden="true" />
              <strong>Pilih dokumen Word untuk dijadikan PDF</strong>
              <span>Atau seret file .docx ke sini. Dokumen dibuka di browser dan tidak diunggah ke mana pun.</span>
            </button>
          )}
          {doc.phase !== "empty" && (
            <header className="workspace__head">
              <h2>{ready ? `${doc.sheets.toLocaleString("id-ID")} halaman` : doc.phase === "opening" ? "Membuka dokumen…" : "Dokumen tidak bisa dibuka"}</h2>
              <p>{ready ? `${pageInfo}. Pratinjau sama dengan hasil cetak.` : doc.phase === "error" ? doc.message : doc.file.name}</p>
            </header>
          )}
          <div className={`word-preview${ready ? "" : " is-hidden"}`}>
            <iframe ref={frameRef} title="Pratinjau dokumen" srcDoc={FRAME_SRCDOC} sandbox="allow-same-origin allow-modals" />
          </div>
          {doc.phase === "opening" && (
            <div className="word-preview__loading" aria-hidden="true">
              <Bone w="min(100%, 420px)" h="auto" r={2} style={{ aspectRatio: "210 / 297" }} />
            </div>
          )}
        </main>
      </div>

      {picker.input}
      {overlay}
    </div>
  );
}
