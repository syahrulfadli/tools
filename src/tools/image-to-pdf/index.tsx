import { ConverterSkeleton } from "../../components/tool/ConverterSkeleton";
import type { ToolDefinition } from "../types";
import { ImageToPdfPreview } from "./Preview";

export const imageToPdf: ToolDefinition = {
  slug: "gambar-ke-pdf",
  name: "Gambar ke PDF",
  description: "Gabungkan JPEG, PNG, dan gambar lain menjadi satu PDF. Gambar bisa diurutkan dan diputar, dengan pilihan kertas A4/F4/Letter dan margin.",
  category: "file-converter",
  keywords: ["jpg", "jpeg", "png", "webp", "pdf", "jpg to pdf", "png to pdf", "image to pdf", "convert", "konversi", "gabung", "scan", "foto", "a4", "f4"],
  load: () => import("./ImageToPdfTool"),
  Skeleton: () => <ConverterSkeleton title="Gambar ke PDF" sections={["Gambar", "Ukuran kertas", "Tata letak", "Ukuran file"]} />,
  Preview: ImageToPdfPreview,
};
