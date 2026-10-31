/**
 * Membaca SVG dan menggambarnya ke kanvas di browser. SVG dimuat sebagai `<img>`, jadi skrip di
 * dalamnya tidak pernah jalan dan sumber eksternal (gambar, font dari URL) tidak dimuat.
 */
import { canvasToBlob, releaseCanvas } from "../../../lib/canvas";
import { intrinsicSize } from "./size";

const SVG_NS = "http://www.w3.org/2000/svg";

export const ACCEPTED_TYPES = ["image/svg+xml", ".svg"];

export type OutputFormat = "png" | "jpeg";

export interface SvgSource {
  /** Teks SVG, sudah diberi xmlns bila aslinya tidak punya. */
  text: string;
  width: number;
  height: number;
  declared: boolean;
}

export interface RenderOptions {
  format: OutputFormat;
  /** Warna CSS, atau "transparent" (hanya PNG). */
  background: string;
  /** 0–1, hanya JPEG. */
  quality: number;
  width: number;
  height: number;
}

export function isSvg(file: File) {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
}

/** Teks yang ditempel terlihat seperti kode SVG (mis. "Copy as SVG" dari Figma). */
export function looksLikeSvg(text: string) {
  return /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*<svg[\s/>]/i.test(text);
}

function parse(text: string) {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = doc.documentElement;
  if (doc.getElementsByTagName("parsererror").length > 0 || root.localName !== "svg") return null;
  return doc;
}

export async function readSvg(file: File): Promise<SvgSource> {
  let text = await file.text();
  let doc = parse(text);
  // SVG tanpa xmlns tampil di HTML, tapi tidak bisa dimuat sebagai gambar.
  if (doc && doc.documentElement.namespaceURI !== SVG_NS) {
    text = text.replace(/<svg\b/i, `<svg xmlns="${SVG_NS}"`);
    doc = parse(text);
  }
  if (!doc) throw new Error("bukan SVG yang valid.");
  const root = doc.documentElement;
  const size = intrinsicSize({ width: root.getAttribute("width"), height: root.getAttribute("height"), viewBox: root.getAttribute("viewBox") });
  return { text, ...size };
}

/**
 * Gambar ulang SVG pada ukuran hasil, bukan memperbesar bitmap: width/height akar diganti ukuran
 * piksel tujuan, dan viewBox ditambahkan bila tidak ada agar isinya ikut berskala.
 */
export async function renderSvg(source: SvgSource, options: RenderOptions) {
  const doc = parse(source.text)!;
  const root = doc.documentElement;
  if (!root.hasAttribute("viewBox")) root.setAttribute("viewBox", `0 0 ${source.width} ${source.height}`);
  root.setAttribute("width", String(options.width));
  root.setAttribute("height", String(options.height));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)], { type: "image/svg+xml" }));
  const canvas = document.createElement("canvas");
  try {
    const image = await loadImage(url);
    canvas.width = options.width;
    canvas.height = options.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak mendukung canvas 2D.");
    const background = options.format === "jpeg" && options.background === "transparent" ? "#ffffff" : options.background;
    if (background !== "transparent") {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, options.width, options.height);
    }
    ctx.drawImage(image, 0, 0, options.width, options.height);
    try {
      return await canvasToBlob(canvas, options.format === "png" ? "image/png" : "image/jpeg", options.quality);
    } catch {
      // Safari menandai kanvas "tainted" bila SVG memuat foreignObject.
      throw new Error("Browser menolak menggambar SVG ini (biasanya karena foreignObject).");
    }
  } finally {
    URL.revokeObjectURL(url);
    releaseCanvas(canvas);
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("SVG tidak bisa digambar browser."));
    image.src = url;
  });
}
