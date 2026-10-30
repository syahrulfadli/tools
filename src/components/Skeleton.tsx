import type { CSSProperties, ReactNode } from "react";
import "./skeleton.css";

/**
 * Primitif skeleton. Aturan: bentuk akhir halaman dengan tiap nilai diganti balok abu
 * seukuran aslinya, tanpa gradien shimmer, dan tanpa geser layout saat data datang.
 */
export function Bone({
  w = "100%",
  h = 12,
  r,
  style,
}: {
  w?: number | string;
  h?: number | string;
  r?: number;
  style?: CSSProperties;
}) {
  return <span className="bone" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/** Garis progres tipis di puncak jendela: tanda bahwa perpindahan halaman sedang berjalan. */
export function RouteProgress() {
  return <div className="route-progress" role="progressbar" aria-label="Memuat halaman" />;
}

/** Pembungkus semua skeleton halaman: menandai area sibuk untuk pembaca layar. */
export function SkeletonPage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="skeleton-page" aria-busy="true" aria-live="polite">
      <RouteProgress />
      <span className="visually-hidden">{label}</span>
      {children}
    </div>
  );
}
