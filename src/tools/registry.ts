import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { ToolDefinition } from "./types";
import { categories, findCategory, type Category } from "./categories";
import { arrangePdf } from "./arrange-pdf";
import { collage } from "./collage";
import { compressImage } from "./compress-image";
import { compressPdf } from "./compress-pdf";
import { imageToPdf } from "./image-to-pdf";
import { imageToSvg } from "./image-to-svg";
import { mergePdf } from "./merge-pdf";
import { pdfToImage } from "./pdf-to-image";
import { pdfToText } from "./pdf-to-text";
import { pngToJpg } from "./png-to-jpg";
import { pomodoro } from "./pomodoro";
import { qrCode } from "./qr-code";
import { signPdf } from "./sign-pdf";
import { splitPdf } from "./split-pdf";
import { stampPdf } from "./stamp-pdf";
import { svgToImage } from "./svg-to-image";
import { timer } from "./timer";
import { wordToPdf } from "./word-to-pdf";
import { worldClock } from "./world-clock";

/** Daftar semua tool, urut sesuai tampilan di home. Tambah tool baru di sini. */
export const tools: ToolDefinition[] = [collage, pdfToImage, imageToPdf, wordToPdf, pngToJpg, svgToImage, imageToSvg, pdfToText, qrCode, mergePdf, splitPdf, arrangePdf, stampPdf, signPdf, compressImage, compressPdf, timer, pomodoro, worldClock];

const lazyCache = new Map<string, LazyExoticComponent<ComponentType>>();

export function findTool(slug: string | undefined): ToolDefinition | undefined {
  return tools.find((tool) => tool.slug === slug);
}

/** Komponen lazy per tool, dibuat sekali agar chunk yang sudah termuat tidak memicu skeleton lagi. */
export function lazyTool(tool: ToolDefinition) {
  let component = lazyCache.get(tool.slug);
  if (!component) {
    component = lazy(tool.load);
    lazyCache.set(tool.slug, component);
  }
  return component;
}

/** Mulai unduh chunk tool lebih awal (hover/fokus di home) supaya pindah halaman terasa instan. */
export function preloadTool(tool: ToolDefinition) {
  void tool.load();
}

export function toolPath(tool: ToolDefinition) {
  return `/tools/${tool.slug}`;
}

/** Pencarian sederhana: setiap kata harus muncul di nama, deskripsi, kategori, atau kata kunci. */
export function searchTools(query: string): ToolDefinition[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return tools;
  return tools.filter((tool) => {
    const haystack = normalize(
      [tool.name, tool.description, findCategory(tool.category)?.name ?? "", tool.slug, ...tool.keywords].join(" "),
    );
    return terms.every((term) => haystack.includes(term));
  });
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Kelompokkan tool per kategori, urut sesuai `categories`; kategori tanpa tool dilewati. */
export function groupByCategory(list: ToolDefinition[]): { category: Category; tools: ToolDefinition[] }[] {
  return categories
    .map((category) => ({ category, tools: list.filter((tool) => tool.category === category.id) }))
    .filter((group) => group.tools.length > 0);
}
