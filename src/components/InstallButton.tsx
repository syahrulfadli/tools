import { useEffect, useRef, useState } from "react";
import { Download, Share } from "lucide-react";
import { promptInstall, useInstallOption } from "../lib/pwa";

/**
 * "Pasang aplikasi" di bar atas. Chrome/Edge: membuka dialog pasang bawaan.
 * iOS: membuka petunjuk singkat karena Safari tidak punya dialog pasang.
 * Tidak tampil bila browser tidak menawarkan pemasangan atau aplikasi sudah terpasang.
 */
export function InstallButton() {
  const option = useInstallOption();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!option) return null;

  return (
    <div className="install" ref={rootRef}>
      <button
        type="button"
        className="btn btn--ghost install__button"
        aria-label="Pasang aplikasi"
        title="Pasang aplikasi"
        aria-expanded={option === "ios" ? open : undefined}
        aria-controls={option === "ios" ? "install-help" : undefined}
        onClick={() => (option === "prompt" ? void promptInstall() : setOpen((value) => !value))}
      >
        <Download size={16} strokeWidth={1.5} aria-hidden="true" />
        <span>Pasang aplikasi</span>
      </button>
      {option === "ios" && open && (
        <div id="install-help" className="install__help" role="dialog" aria-label="Cara memasang">
          <p>
            Ketuk <Share size={14} strokeWidth={1.5} aria-label="Bagikan" className="install__glyph" /> Bagikan di
            Safari, lalu pilih <strong>Tambah ke Layar Utama</strong>.
          </p>
          <p className="install__note">Setelah terpasang, tools terbuka layar penuh dan tetap bisa dipakai tanpa internet.</p>
        </div>
      )}
    </div>
  );
}
