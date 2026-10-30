import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { PdfToJpgPreview } from "./Preview";

export const pdfToJpg: ToolDefinition = {
  slug: "pdf-ke-jpg",
  name: "PDF ke JPEG",
  description: "Ubah halaman PDF jadi gambar JPEG. Pilih halaman, resolusi sampai 300 dpi, dan kualitas.",
  category: "file-converter",
  keywords: ["pdf", "jpg", "jpeg", "gambar", "image", "convert", "konversi", "ubah", "pdf to jpg", "halaman"],
  load: () => import("./PdfToJpgTool"),
  Skeleton: () => <ConverterSkeleton title="PDF ke JPEG" sections={["Dokumen", "Resolusi", "Kualitas JPEG", "Halaman"]} />,
  Preview: PdfToJpgPreview,
};
