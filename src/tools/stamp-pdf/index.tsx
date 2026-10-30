import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { StampPdfPreview } from "./Preview";

export const stampPdf: ToolDefinition = {
  slug: "nomor-halaman-watermark",
  name: "Nomor Halaman & Watermark",
  description: "Tambahkan nomor halaman di posisi pilihanmu, atau watermark teks transparan seperti RAHASIA dan DRAF, ke setiap halaman PDF.",
  category: "pdf-tools",
  keywords: ["nomor halaman", "page number", "penomoran", "watermark", "tanda air", "stempel", "stamp", "rahasia", "draf", "draft", "pdf", "teks"],
  load: () => import("./StampPdfTool"),
  Skeleton: () => <ConverterSkeleton title="Nomor Halaman & Watermark" sections={["Dokumen", "Nomor halaman", "Watermark"]} />,
  Preview: StampPdfPreview,
};
