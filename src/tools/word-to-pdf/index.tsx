import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { WordToPdfPreview } from "./Preview";

export const wordToPdf: ToolDefinition = {
  slug: "word-ke-pdf",
  name: "Word ke PDF",
  description: "Ubah dokumen Word (.docx) menjadi PDF dengan ukuran kertas dan margin sesuai dokumen aslinya. Teksnya tetap bisa disalin.",
  category: "file-converter",
  keywords: ["word", "docx", "doc", "pdf", "word to pdf", "docx to pdf", "convert", "konversi", "ubah", "dokumen", "surat", "cv", "skripsi", "makalah"],
  load: () => import("./WordToPdfTool"),
  Skeleton: () => <ConverterSkeleton title="Word ke PDF" sections={["Dokumen", "Simpan sebagai PDF", "Nama file"]} />,
  Preview: WordToPdfPreview,
};
