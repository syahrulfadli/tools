import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { PngToJpgPreview } from "./Preview";

export const pngToJpg: ToolDefinition = {
  slug: "png-ke-jpg",
  name: "PNG ke JPEG",
  description: "Ubah banyak PNG sekaligus menjadi JPEG yang lebih ringan. Area transparan bisa diberi warna latar pilihanmu.",
  category: "file-converter",
  keywords: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "convert", "konversi", "ubah", "kompres", "gambar", "image"],
  load: () => import("./PngToJpgTool"),
  Skeleton: () => <ConverterSkeleton title="PNG ke JPEG" sections={["Gambar", "Kualitas JPEG", "Latar area transparan", "Ukuran"]} />,
  Preview: PngToJpgPreview,
};
