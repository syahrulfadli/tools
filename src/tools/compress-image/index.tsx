import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { CompressImagePreview } from "./Preview";

export const compressImage: ToolDefinition = {
  slug: "kompres-gambar",
  name: "Kompres Gambar",
  description: "Perkecil ukuran JPEG, PNG, dan WebP sekaligus. Atur kualitas dan dimensinya, lalu lihat hasilnya secara langsung.",
  category: "compressor",
  keywords: ["compress", "kompres", "perkecil", "kecilkan", "resize", "jpg", "jpeg", "png", "webp", "foto", "gambar", "image", "ukuran", "kb", "mb", "optimize"],
  load: () => import("./CompressImageTool"),
  Skeleton: () => <ConverterSkeleton title="Kompres Gambar" sections={["Gambar", "Format", "Kualitas", "Ukuran"]} />,
  Preview: CompressImagePreview,
};
