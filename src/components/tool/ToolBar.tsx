import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

/**
 * Bar atas semua tool: kembali, nama tool (h1), pill status, pesan status, aksi.
 * `status` tampil rata kanan di desktop dan menjadi toast di ponsel.
 */
export function ToolBar({
  title,
  pill,
  status,
  actions,
}: {
  title: string;
  pill?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="tool-bar">
      <Link to="/" className="btn btn--ghost btn--icon" aria-label="Kembali ke semua tool">
        <ArrowLeft size={16} strokeWidth={1.5} />
      </Link>
      <h1>{title}</h1>
      {pill !== undefined && <span className="pill num">{pill}</span>}
      <p className="tool-bar__status" role="status" aria-live="polite">
        {status}
      </p>
      <div className="tool-bar__actions">{actions}</div>
    </header>
  );
}
