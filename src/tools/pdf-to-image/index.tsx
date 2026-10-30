import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { PdfToImagePreview } from "./Preview";

export const pdfToImage: ToolDefinition = {
  slug: "pdf-ke-gambar",
  name: "PDF ke Gambar",
  description: "Ubah halaman PDF menjadi gambar JPEG atau PNG. Kamu bisa memilih halaman, resolusi hingga 300 dpi, dan kualitasnya.",
  category: "file-converter",
  keywords: ["pdf", "jpg", "jpeg", "png", "gambar", "image", "convert", "konversi", "ubah", "pdf to jpg", "pdf to png", "pdf to image", "halaman"],
  load: () => import("./PdfToImageTool"),
  Skeleton: () => <ConverterSkeleton title="PDF ke Gambar" sections={["Dokumen", "Resolusi", "Format gambar", "Halaman"]} />,
  Preview: PdfToImagePreview,
};
