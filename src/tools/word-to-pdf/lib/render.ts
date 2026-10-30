/**
 * Merender .docx ke HTML (docx-preview) di dalam iframe, lalu mencetaknya lewat dialog
 * cetak browser ("Simpan sebagai PDF"). Teks tetap teks (bisa dipilih dan dicari), bukan gambar.
 *
 * Iframe memisahkan gaya dokumen dari gaya aplikasi dan menjadi halaman yang dicetak,
 * jadi pratinjau dan hasil cetak memakai HTML dan CSS yang sama.
 */
import { parseAsync, renderDocument, type Options } from "docx-preview";
import { withFallback } from "./fonts";
import { pageRules, pageSizeOf, printedSheets, type PageSize } from "./pages";
import { breakBeforeNewSections } from "./sections";

const OPTIONS: Partial<Options> = {
  className: "docx",
  inWrapper: true,
  hideWrapperOnPrint: true,
  // Ikuti pemisah halaman yang disimpan Word agar halaman PDF sama dengan di Word.
  ignoreLastRenderedPageBreak: false,
  // Data URL: tidak ada object URL yang perlu dilepas, dan lolos CSP img/font-src.
  useBase64URL: true,
  renderComments: false,
  renderChanges: false,
};

export const ACCEPTED = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isDocx(file: File) {
  return /\.docx$/i.test(file.name) || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

/** Alasan file ditolak, dibaca dari ekstensi (sebelum file dibuka). */
export function rejectReason(file: File): string {
  if (/\.(doc|dot)$/i.test(file.name)) return "format Word lama (.doc). Buka di Word, lalu Simpan Sebagai .docx.";
  if (/\.(odt|rtf|pages)$/i.test(file.name)) return "bukan .docx. Simpan ulang sebagai dokumen Word (.docx) dulu.";
  return "bukan dokumen Word (.docx).";
}

/** Jenis wadah file dari byte awalnya: ZIP (.docx) atau OLE (.doc lama / .docx berkata sandi). */
export function containerKind(head: Uint8Array): "zip" | "ole" | "unknown" {
  if (head[0] === 0x50 && head[1] === 0x4b) return "zip";
  if ([0xd0, 0xcf, 0x11, 0xe0].every((byte, i) => head[i] === byte)) return "ole";
  return "unknown";
}

export interface RenderedDoc {
  /** Ukuran tiap halaman Word (section docx-preview), dalam pt. */
  pages: PageSize[];
  /** Perkiraan lembar PDF; bisa lebih banyak dari `pages` bila isi halaman melebihi kertas. */
  sheets: number;
}

/** Dokumen awal iframe: gaya pratinjau (layar) dan cetak di sekeliling keluaran docx-preview. */
export const FRAME_SRCDOC = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<style>
html { background: var(--well, #e8e9e5); }
body { margin: 0; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@media screen {
  .docx-wrapper { background: none !important; padding: 20px !important; gap: 20px; zoom: var(--zoom, 1); }
  .docx-wrapper > section.docx { margin: 0 !important; box-shadow: none !important; outline: 1px solid var(--border, #e6e7e4); }
}
@media print {
  html { background: none; }
  .docx-wrapper > section.docx { margin: 0; break-after: page; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .docx-wrapper > section.docx:last-child { break-after: auto; }
}
</style>
<style id="docx-pages"></style>
</head>
<body><div id="docx-root"></div></body>
</html>`;

export async function renderDocx(file: File, doc: Document): Promise<RenderedDoc> {
  const kind = containerKind(new Uint8Array(await file.slice(0, 4).arrayBuffer()));
  if (kind === "ole") throw new Error("File ini format Word lama (.doc) atau dilindungi kata sandi. Simpan ulang sebagai .docx tanpa kata sandi.");
  if (kind !== "zip") throw new Error("File ini tidak bisa dibaca sebagai dokumen Word (.docx).");

  const root = doc.getElementById("docx-root")!;
  clearDocx(doc);
  try {
    // Sama dengan renderAsync, ditambah perbaikan pemisah bagian sebelum dirender.
    const word = await parseAsync(file, OPTIONS);
    const body = word.documentPart?.body;
    if (body?.children) breakBeforeNewSections(body.children, body.props);
    for (const node of await renderDocument(word, OPTIONS)) {
      // Gaya di <head>: elemen apa pun sebelum section ikut halaman @page tanpa nama dan
      // memunculkan lembar kosong di awal PDF.
      if (node.nodeName === "STYLE") {
        (node as HTMLStyleElement).dataset.docx = "";
        doc.head.append(node);
      } else root.append(node);
    }
  } catch {
    clearDocx(doc);
    throw new Error("Dokumen tidak bisa dibuka. File mungkin rusak atau bukan .docx.");
  }

  const sections = Array.from(root.querySelectorAll<HTMLElement>(".docx-wrapper > section.docx"));
  const pages = sections.map((section) => pageSizeOf(section.style.width, section.style.minHeight));
  const rules = pageRules(pages);
  doc.getElementById("docx-pages")!.textContent = rules.css;
  sections.forEach((section, i) => {
    section.style.setProperty("page", rules.names[i]);
    // Sedikit lebih pendek dari kertas agar pembulatan subpiksel tidak memunculkan lembar kosong.
    if (section.style.minHeight) section.style.minHeight = `calc(${section.style.minHeight} - 1pt)`;
  });

  applyFontFallbacks(doc);
  await Promise.all([doc.fonts.ready, ...Array.from(doc.images, (img) => img.decode().catch(() => undefined))]);

  // Ukur sebelum zoom pratinjau dipasang: 1 px CSS = 0,75 pt.
  doc.documentElement.style.setProperty("--zoom", "1");
  const sheets = sections.reduce((total, section, i) => {
    const css = doc.defaultView!.getComputedStyle(section);
    const pt = (px: string) => parseFloat(px) * 0.75;
    return total + printedSheets(section.offsetHeight * 0.75, pages[i].height, pt(css.paddingTop), pt(css.paddingBottom));
  }, 0);

  return { pages, sheets: Math.max(1, sheets) };
}

/** Kosongkan isi dan gaya dokumen sebelumnya dari iframe. */
export function clearDocx(doc: Document) {
  doc.getElementById("docx-root")!.replaceChildren();
  doc.head.querySelectorAll("style[data-docx]").forEach((style) => style.remove());
}

/** Beri cadangan pada setiap font-family di gaya dokumen dan gaya inline. */
function applyFontFallbacks(doc: Document) {
  const patch = (style: CSSStyleDeclaration) => {
    if (style.fontFamily) style.fontFamily = withFallback(style.fontFamily);
    // Font tema: `.docx { --docx-minorHAnsi-font: Calibri }`.
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      if (/^--docx-.+-font$/.test(prop)) style.setProperty(prop, withFallback(style.getPropertyValue(prop).trim()));
    }
  };
  // Duck typing: CSSStyleRule milik iframe bukan instance kelas di jendela utama.
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if ("cssRules" in rule) walk((rule as CSSGroupingRule).cssRules);
      if ("selectorText" in rule) patch((rule as CSSStyleRule).style);
    }
  };
  for (const sheet of Array.from(doc.styleSheets)) walk(sheet.cssRules);
  doc.querySelectorAll<HTMLElement>("[style*='font-family']").forEach((el) => patch(el.style));
}

/** Zoom pratinjau agar halaman terlebar muat di lebar iframe; cetak selalu 100%. */
export function fitZoom(doc: Document, pages: PageSize[], frameWidth: number) {
  const widest = Math.max(...pages.map((page) => page.width)) / 0.75;
  const zoom = Math.min(1, Math.max(0.2, (frameWidth - 40) / widest));
  doc.documentElement.style.setProperty("--zoom", zoom.toFixed(3));
}

/** Buka dialog cetak untuk isi iframe. `title` jadi nama file usulan di "Simpan sebagai PDF". */
export function printFrame(frame: HTMLIFrameElement, title: string) {
  const win = frame.contentWindow!;
  const doc = frame.contentDocument!;
  // Chrome/Edge memakai judul dokumen sebagai nama file PDF; sebagian memakai judul jendela utama.
  doc.title = title;
  const previous = document.title;
  document.title = title;
  try {
    win.focus();
    // Menahan halaman sampai dialog ditutup (Chrome, Edge, Firefox).
    win.print();
  } finally {
    document.title = previous;
  }
}
