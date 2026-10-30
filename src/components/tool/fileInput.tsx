import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";

/**
 * Seret-lepas file ke seluruh halaman tool. Kembalikan `dropProps` untuk elemen akar tool
 * dan `overlay` untuk dirender di dalamnya. Elemen anak yang menangani drop sendiri
 * (mis. sel kolase) cukup memanggil `event.stopPropagation()`.
 */
export function usePageFileDrop(onFiles: (files: File[]) => void, label = "Lepaskan untuk menambah file") {
  const [dragging, setDragging] = useState(false);
  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

  const dropProps = {
    onDragEnter: (event: DragEvent<HTMLElement>) => {
      if (hasFiles(event)) setDragging(true);
    },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (hasFiles(event)) event.preventDefault();
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      setDragging(false);
      if (!event.dataTransfer.files.length) return;
      event.preventDefault();
      onFiles(Array.from(event.dataTransfer.files));
    },
    onDropCapture: () => setDragging(false),
  };

  const overlay: ReactNode = dragging ? (
    <div className="drop-overlay" aria-hidden="true">
      <p>{label}</p>
    </div>
  ) : null;

  return { dropProps, overlay };
}

/** Tempel file dari clipboard (Ctrl/⌘+V), kecuali saat fokus di input teks. */
export function usePasteFiles(onFiles: (files: File[]) => void) {
  const latest = useRef(onFiles);
  latest.current = onFiles;
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      if ((event.target as HTMLElement).closest("input, textarea")) return;
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length === 0) return;
      event.preventDefault();
      latest.current(files);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);
}

/** Input file tersembunyi yang dibuka lewat `open()`. Nilai input dikosongkan setelah dipilih. */
export function useFilePicker(accept: string, multiple: boolean, onFiles: (files: File[]) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={ref}
      type="file"
      accept={accept}
      multiple={multiple}
      hidden
      onChange={(event) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";
        if (files.length) onFiles(files);
      }}
    />
  );
  return { input, open: () => ref.current?.click() };
}
