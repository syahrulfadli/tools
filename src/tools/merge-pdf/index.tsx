import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { MergePdfPreview } from "./Preview";

export const mergePdf: ToolDefinition = {
  slug: "gabung-pdf",
  name: "Gabung PDF",
  description: "Gabungkan beberapa PDF menjadi satu file. Kamu bisa mengatur urutannya, dan halaman serta teks tetap utuh.",
  category: "pdf-tools",
  keywords: ["merge", "gabung", "gabungkan", "satukan", "combine", "join", "pdf", "dokumen", "urutan", "halaman"],
  load: () => import("./MergePdfTool"),
  Skeleton: () => <ConverterSkeleton title="Gabung PDF" sections={["PDF", "Urutan"]} />,
  Preview: MergePdfPreview,
};
