import type { ToolDefinition } from "../types";
import { TimerPreview } from "./Preview";
import { TimerSkeleton } from "./TimerSkeleton";

export const timer: ToolDefinition = {
  slug: "timer",
  name: "Timer & Stopwatch",
  description: "Hitung mundur dengan alarm, termasuk Pomodoro 25 menit, dan stopwatch dengan catatan putaran.",
  category: "time",
  keywords: ["timer", "stopwatch", "hitung mundur", "countdown", "alarm", "pomodoro", "lap", "putaran", "waktu", "jam"],
  load: () => import("./TimerTool"),
  Skeleton: TimerSkeleton,
  Preview: TimerPreview,
};
