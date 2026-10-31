import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { SvgToImagePreview } from "./Preview";

export const svgToImage: ToolDefinition = {
  slug: "svg-ke-gambar",
  name: "SVG ke Gambar",
  description: "Ubah banyak SVG sekaligus menjadi PNG atau JPEG yang tajam di ukuran berapa pun, dengan latar transparan atau berwarna.",
  category: "file-converter",
  keywords: ["svg", "png", "jpg", "jpeg", "vector", "vektor", "ikon", "icon", "logo", "export", "rasterize", "convert", "konversi", "ubah", "gambar", "image"],
  load: () => import("./SvgToImageTool"),
  Skeleton: () => <ConverterSkeleton title="SVG ke Gambar" sections={["File SVG", "Format", "Ukuran", "Latar"]} />,
  Preview: SvgToImagePreview,
};
