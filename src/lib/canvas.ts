/** Batas aman kanvas lintas browser: Safari iOS menolak kanvas di atas ~16,7 juta piksel. */
export const MAX_CANVAS_AREA = 16_777_216;
export const MAX_CANVAS_SIDE = 16_384;

/** Faktor (≤ 1) agar kanvas w×h tidak melewati batas luas dan sisi. */
export function canvasLimitFactor(width: number, height: number) {
  const byArea = Math.sqrt(MAX_CANVAS_AREA / (width * height));
  const bySide = MAX_CANVAS_SIDE / Math.max(width, height);
  return Math.min(1, byArea, bySide);
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Gagal membuat file gambar."))), type, quality),
  );
}

/** Lepas memori kanvas besar secepatnya (penting di perangkat mobile). */
export function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}
