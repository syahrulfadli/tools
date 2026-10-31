/**
 * Ukuran lacak dan SVG "sematkan". Terpisah dari `trace.ts` agar chunk tool tidak ikut membawa
 * imagetracerjs, yang hanya dimuat di Web Worker.
 */

/** Ukuran gambar yang dilacak: sisi terpanjang dibatasi `maxEdge`, tanpa memperbesar. */
export function traceSize(width: number, height: number, maxEdge: number) {
  const factor = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * factor)), height: Math.max(1, Math.round(height * factor)) };
}

/** SVG berisi gambar asli apa adanya (tidak dilacak): berguna saat butuh file .svg tanpa mengubah tampilan. */
export function embedSvg(dataUrl: string, width: number, height: number) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n` +
    `<image width="${width}" height="${height}" href="${dataUrl}"/>\n` +
    `</svg>\n`
  );
}
