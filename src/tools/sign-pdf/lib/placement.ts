/**
 * Posisi tanda tangan di halaman. Disimpan relatif (0–1) terhadap halaman seperti terlihat,
 * titik asal kiri atas, supaya tidak bergantung pada ukuran pratinjau. Fungsi murni.
 */

export interface Placement {
  id: string;
  /** Nomor halaman, mulai 1. */
  page: number;
  /** Kiri atas, relatif lebar/tinggi halaman. */
  x: number;
  y: number;
  /** Lebar relatif lebar halaman. Tinggi mengikuti rasio gambar tanda tangan. */
  w: number;
}

export const MIN_WIDTH = 0.04;

/** Tinggi relatif tinggi halaman. `ratio` = tinggi/lebar gambar, `pageAspect` = lebar/tinggi halaman. */
export function placementHeight(w: number, ratio: number, pageAspect: number) {
  return w * ratio * pageAspect;
}

/** Jepit agar seluruh tanda tangan tetap di dalam halaman. */
export function clampPlacement<T extends Placement>(p: T, ratio: number, pageAspect: number): T {
  let w = Math.min(1, Math.max(MIN_WIDTH, p.w));
  // Tanda tangan yang lebih tinggi dari halaman dikecilkan sampai muat.
  const maxW = 1 / (ratio * pageAspect);
  if (w > maxW) w = maxW;
  const h = placementHeight(w, ratio, pageAspect);
  return { ...p, w, x: Math.min(1 - w, Math.max(0, p.x)), y: Math.min(1 - h, Math.max(0, p.y)) };
}

/** Tanda tangan baru berpusat di titik (cx, cy) relatif, lebar bawaan ±28% halaman. */
export function placeAt(id: string, page: number, cx: number, cy: number, ratio: number, pageAspect: number, w = 0.28): Placement {
  const h = placementHeight(w, ratio, pageAspect);
  return clampPlacement({ id, page, x: cx - w / 2, y: cy - h / 2, w }, ratio, pageAspect);
}

/**
 * Persegi dalam poin di ruang tampilan PDF (asal kiri bawah) untuk `toUserSpace`.
 * `page` = ukuran halaman seperti terlihat.
 */
export function toPdfRect(p: Placement, ratio: number, page: { width: number; height: number }) {
  const width = p.w * page.width;
  const height = width * ratio;
  return { x: p.x * page.width, y: page.height - p.y * page.height - height, width, height };
}
