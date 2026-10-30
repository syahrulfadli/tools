import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { SplitPdfPreview } from "./Preview";

export const splitPdf: ToolDefinition = {
  slug: "pisah-pdf",
  name: "Pisah PDF",
  description: "Ambil halaman tertentu dari PDF atau bagi jadi beberapa file menurut rentang atau jumlah halaman.",
  category: "pdf-tools",
  keywords: ["split", "pisah", "pisahkan", "potong", "bagi", "ekstrak", "extract", "ambil halaman", "hapus halaman", "pdf", "halaman", "rentang"],
  load: () => import("./SplitPdfTool"),
  Skeleton: () => <ConverterSkeleton title="Pisah PDF" sections={["Dokumen", "Cara memisah", "Halaman"]} />,
  Preview: SplitPdfPreview,
};
