import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { SignPdfPreview } from "./Preview";

export const signPdf: ToolDefinition = {
  slug: "tanda-tangan-pdf",
  name: "Tanda Tangan PDF",
  description: "Gambar tanda tanganmu atau unggah fotonya, lalu tempel di halaman PDF mana pun tanpa perlu mencetak dan memindai.",
  category: "pdf-tools",
  keywords: ["tanda tangan", "ttd", "sign", "signature", "esign", "paraf", "tandatangan", "pdf", "dokumen", "kontrak"],
  load: () => import("./SignPdfTool"),
  Skeleton: () => <ConverterSkeleton title="Tanda Tangan PDF" sections={["Dokumen", "Tanda tangan", "Penempatan"]} />,
  Preview: SignPdfPreview,
};
