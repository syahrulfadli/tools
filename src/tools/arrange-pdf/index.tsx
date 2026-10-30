import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { ArrangePdfPreview } from "./Preview";

export const arrangePdf: ToolDefinition = {
  slug: "atur-halaman-pdf",
  name: "Atur Halaman PDF",
  description: "Ubah urutan halaman PDF dengan diseret, hapus halaman yang tidak perlu, dan putar halaman yang miring.",
  category: "pdf-tools",
  keywords: ["atur", "urutkan", "susun", "reorder", "organize", "hapus halaman", "delete page", "buang", "putar", "rotate", "pdf", "halaman"],
  load: () => import("./ArrangePdfTool"),
  Skeleton: () => <ConverterSkeleton title="Atur Halaman PDF" sections={["Dokumen", "Hapus halaman", "Semua halaman"]} />,
  Preview: ArrangePdfPreview,
};
