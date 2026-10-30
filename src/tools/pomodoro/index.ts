import type { ToolDefinition } from "../types";
import { PomodoroSkeleton } from "./PomodoroSkeleton";
import { PomodoroPreview } from "./Preview";

export const pomodoro: ToolDefinition = {
  slug: "pomodoro",
  name: "Pomodoro",
  description: "Siklus fokus 25 menit dan istirahat 5 menit yang berganti sendiri, dengan istirahat panjang setiap empat sesi dan durasi yang bisa diatur.",
  category: "time",
  keywords: ["pomodoro", "fokus", "focus", "belajar", "kerja", "istirahat", "break", "produktif", "timer", "tomat", "sesi"],
  load: () => import("./PomodoroTool"),
  Skeleton: PomodoroSkeleton,
  Preview: PomodoroPreview,
};
