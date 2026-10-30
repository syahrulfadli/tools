import type { ToolDefinition } from "../types";
import { TimerPreview } from "./Preview";
import { TimerSkeleton } from "./TimerSkeleton";

export const timer: ToolDefinition = {
  slug: "timer",
  name: "Timer & Stopwatch",
  description: "Hitung mundur dengan alarm, termasuk preset Pomodoro 25 menit, serta stopwatch dengan catatan putaran (lap).",
  category: "time",
  keywords: ["timer", "stopwatch", "hitung mundur", "countdown", "alarm", "pomodoro", "lap", "putaran", "waktu", "jam"],
  load: () => import("./TimerTool"),
  Skeleton: TimerSkeleton,
  Preview: TimerPreview,
};
