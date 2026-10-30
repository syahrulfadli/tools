import type { ReactNode } from "react";
import { Link } from "react-router";
import { ShieldCheck } from "lucide-react";
import { BrandMark } from "./BrandMark";
import "./app-frame.css";

/**
 * Shell "framed-sheet": top bar 48px di atas frame berwarna, konten di sheet putih
 * yang menjorok 8px dari tepi jendela. Dipakai halaman non-tool (home, 404).
 */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="frame">
      <header className="frame__bar">
        <Link to="/" className="frame__brand">
          <BrandMark />
          <span>Productivity Tools</span>
        </Link>
        <p className="frame__note">
          <ShieldCheck size={16} strokeWidth={1.5} aria-hidden="true" />
          <span>File diproses di perangkatmu, tidak pernah disimpan</span>
        </p>
      </header>
      <main className="frame__sheet">{children}</main>
    </div>
  );
}
