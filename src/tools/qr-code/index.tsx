import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { QrCodePreview } from "./Preview";

export const qrCode: ToolDefinition = {
  slug: "qr-code",
  name: "QR Code",
  description: "Ubah teks atau link menjadi QR code yang siap dipindai, lalu unduh sebagai PNG atau SVG dengan warna dan ukuran pilihanmu.",
  category: "file-converter",
  keywords: ["qr", "qr code", "qrcode", "kode qr", "barcode", "link", "url", "tautan", "teks", "pindai", "scan", "generator", "png", "svg"],
  load: () => import("./QrCodeTool"),
  Skeleton: () => <ConverterSkeleton title="QR Code" sections={["Isi", "Ketahanan", "Warna", "Unduhan"]} />,
  Preview: QrCodePreview,
};
