import type { ToolDefinition } from "../types";
import { WorldClockPreview } from "./Preview";
import { WorldClockSkeleton } from "./WorldClockSkeleton";

export const worldClock: ToolDefinition = {
  slug: "jam-dunia",
  name: "Jam Dunia",
  description: "Bandingkan jam di dua kota atau lebih secara berdampingan, lengkap dengan selisih waktu dan pratinjau jam rapat.",
  category: "time",
  keywords: ["jam dunia", "world clock", "zona waktu", "time zone", "timezone", "selisih waktu", "wib", "wita", "wit", "utc", "gmt", "kota", "rapat", "meeting"],
  load: () => import("./WorldClockTool"),
  Skeleton: WorldClockSkeleton,
  Preview: WorldClockPreview,
};
