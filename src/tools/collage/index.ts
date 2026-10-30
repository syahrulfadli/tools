import type { ToolDefinition } from "../types";
import { CollageSkeleton } from "./CollageSkeleton";
import { CollagePreview } from "./Preview";

export const collage: ToolDefinition = {
  slug: "kolase",
  name: "Kolase Foto",
  description: "Gabungkan beberapa foto menjadi satu gambar dengan grid 2×2 sampai 8×8, rasio siap unggah, dan foto yang bisa dipotong atau dibiarkan utuh.",
  category: "image-editor",
  keywords: ["collage", "foto", "gambar", "grid", "photo", "image", "montage", "instagram", "story", "gabung"],
  load: () => import("./CollageTool"),
  Skeleton: CollageSkeleton,
  Preview: CollagePreview,
};
