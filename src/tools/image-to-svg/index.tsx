import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { ImageToSvgPreview } from "./Preview";

export const imageToSvg: ToolDefinition = {
  slug: "gambar-ke-svg",
  name: "Gambar ke SVG",
  description: "Lacak PNG atau JPEG menjadi SVG vektor berwarna atau hitam putih yang bisa diperbesar tanpa pecah.",
  category: "file-converter",
  keywords: ["svg", "png", "jpg", "jpeg", "vector", "vektor", "vectorize", "vektorisasi", "trace", "lacak", "logo", "ikon", "convert", "konversi", "ubah", "gambar", "image"],
  load: () => import("./ImageToSvgTool"),
  Skeleton: () => <ConverterSkeleton title="Gambar ke SVG" sections={["Gambar", "Cara konversi", "Warna", "Detail"]} />,
  Preview: ImageToSvgPreview,
};
