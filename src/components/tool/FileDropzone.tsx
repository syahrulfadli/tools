import type { ReactNode } from "react";
import { X } from "lucide-react";

/** Tombol besar untuk memilih file; menyebut format yang diterima di bawah judulnya. */
export function FileDropzone({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="dropzone" onClick={onClick}>
      {icon}
      <span className="dropzone__title">{title}</span>
      <span className="dropzone__hint">{hint}</span>
    </button>
  );
}

export interface FileFailure {
  name: string;
  reason: string;
}

/** Daftar file yang ditolak atau gagal dibaca, dengan alasannya. */
export function FailureList({ failures, onDismiss }: { failures: FileFailure[]; onDismiss: () => void }) {
  if (failures.length === 0) return null;
  return (
    <div className="failures" role="alert">
      <div className="failures__head">
        <p>{failures.length} file tidak bisa dipakai</p>
        <button type="button" className="btn btn--ghost btn--icon" onClick={onDismiss} aria-label="Tutup pesan">
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
      <ul>
        {failures.map((failure, i) => (
          <li key={i}>
            <strong>{failure.name}</strong> {failure.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
