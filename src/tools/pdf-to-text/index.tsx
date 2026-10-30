import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { PdfToTextPreview } from "./Preview";

export const pdfToText: ToolDefinition = {
  slug: "pdf-ke-teks",
  name: "PDF ke Teks",
  description: "Ambil teks dari PDF untuk disalin atau diunduh sebagai .txt, dengan pilihan halaman dan baris yang disambung per paragraf.",
  category: "file-converter",
  keywords: ["pdf", "teks", "text", "txt", "ekstrak", "extract", "salin", "copy", "convert", "konversi", "ambil tulisan"],
  load: () => import("./PdfToTextTool"),
  Skeleton: () => <ConverterSkeleton title="PDF ke Teks" sections={["Dokumen", "Halaman", "Susunan teks"]} />,
  Preview: PdfToTextPreview,
};
