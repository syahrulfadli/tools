import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { CompressPdfPreview } from "./Preview";

export const compressPdf: ToolDefinition = {
  slug: "kompres-pdf",
  name: "Kompres PDF",
  description: "Perkecil ukuran PDF supaya mudah dikirim lewat email atau diunggah. Gambarnya dikompres, teksnya tetap bisa disalin.",
  category: "compressor",
  keywords: ["compress", "kompres", "perkecil", "kecilkan", "pdf", "ukuran", "kb", "mb", "email", "scan", "optimize", "reduce"],
  load: () => import("./CompressPdfTool"),
  Skeleton: () => <ConverterSkeleton title="Kompres PDF" sections={["PDF", "Cara kompres", "Tingkat kompresi"]} />,
  Preview: CompressPdfPreview,
};
