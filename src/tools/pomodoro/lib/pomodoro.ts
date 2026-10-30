/**
 * Siklus Pomodoro: fokus → istirahat pendek, dan setiap `longEvery` sesi fokus → istirahat panjang.
 * Reducer murni yang menerima `now`; waktu disimpan sebagai stempel `Date.now()` seperti Timer,
 * jadi tetap benar walau tab di latar atau perangkat sempat tidur.
 */
import { MINUTE } from "../../timer/lib/time";

export type Phase = "focus" | "short" | "long";
export type PomodoroStatus = "idle" | "running" | "paused";

export interface PomodoroSettings {
  /** Menit. */
  focus: number;
  short: number;
  long: number;
  /** Istirahat panjang setelah sekian sesi fokus. */
  longEvery: number;
  /** Fase berikutnya langsung berjalan saat fase sebelumnya habis. */
  autoStart: boolean;
}

export interface PomodoroState {
  phase: Phase;
  status: PomodoroStatus;
  endAt: number | null;
  /** Sisa waktu saat diam atau dijeda. */
  remaining: number;
  /** Sesi fokus selesai di siklus ini (0 sampai longEvery − 1). */
  cycle: number;
  /** Sesi fokus selesai sejak tab dibuka. */
  completed: number;
  /** Total menit fokus yang selesai (ms). */
  focused: number;
}

export type PomodoroAction =
  | { type: "start" }
  | { type: "pause" }
  | { type: "reset" }
  | { type: "skip" }
  | { type: "finish" }
  | { type: "setPhase"; phase: Phase }
  | { type: "settings"; settings: PomodoroSettings };

export const DEFAULT_SETTINGS: PomodoroSettings = { focus: 25, short: 5, long: 15, longEvery: 4, autoStart: false };

export const PHASE_LABELS: Record<Phase, string> = { focus: "Fokus", short: "Istirahat pendek", long: "Istirahat panjang" };

export function phaseDuration(phase: Phase, settings: PomodoroSettings) {
  return settings[phase] * MINUTE;
}

export function initialPomodoro(settings: PomodoroSettings): PomodoroState {
  return { phase: "focus", status: "idle", endAt: null, remaining: phaseDuration("focus", settings), cycle: 0, completed: 0, focused: 0 };
}

export function pomodoroRemaining(state: PomodoroState, now: number) {
  return state.status === "running" && state.endAt !== null ? Math.max(0, state.endAt - now) : state.remaining;
}

/** 0 → baru mulai, 1 → habis. */
export function pomodoroProgress(state: PomodoroState, settings: PomodoroSettings, now: number) {
  const total = phaseDuration(state.phase, settings);
  return total > 0 ? Math.min(1, Math.max(0, 1 - pomodoroRemaining(state, now) / total)) : 0;
}

/** Fase setelah fase ini. `counted` = sesi fokus selesai penuh (bukan dilewati). */
function advance(state: PomodoroState, settings: PomodoroSettings, now: number, counted: boolean): PomodoroState {
  let { cycle, completed, focused } = state;
  let phase: Phase;
  if (state.phase === "focus") {
    if (counted) {
      cycle += 1;
      completed += 1;
      focused += phaseDuration("focus", settings);
    }
    phase = cycle >= settings.longEvery ? "long" : "short";
    if (phase === "long") cycle = 0;
  } else phase = "focus";
  const duration = phaseDuration(phase, settings);
  return settings.autoStart && counted
    ? { phase, status: "running", endAt: now + duration, remaining: duration, cycle, completed, focused }
    : { phase, status: "idle", endAt: null, remaining: duration, cycle, completed, focused };
}

export function pomodoroReducer(state: PomodoroState, action: PomodoroAction, settings: PomodoroSettings, now: number): PomodoroState {
  switch (action.type) {
    case "start":
      if (state.status === "running" || state.remaining <= 0) return state;
      return { ...state, status: "running", endAt: now + state.remaining };
    case "pause":
      if (state.status !== "running") return state;
      return { ...state, status: "paused", remaining: pomodoroRemaining(state, now), endAt: null };
    case "reset":
      return { ...state, status: "idle", endAt: null, remaining: phaseDuration(state.phase, settings) };
    case "skip":
      return advance(state, settings, now, false);
    case "finish":
      if (state.status !== "running" || state.endAt === null || now < state.endAt) return state;
      return advance(state, settings, now, true);
    case "setPhase":
      if (state.status === "running") return state;
      return { ...state, phase: action.phase, status: "idle", endAt: null, remaining: phaseDuration(action.phase, settings) };
    case "settings": {
      // Durasi baru langsung berlaku bila fase ini belum dimulai; yang sedang berjalan tidak diubah.
      const cycle = Math.min(state.cycle, action.settings.longEvery - 1);
      if (state.status !== "idle") return { ...state, cycle };
      return { ...state, cycle, remaining: phaseDuration(state.phase, action.settings) };
    }
  }
}

/** Jepit setelan dari penyimpanan/isian ke rentang yang masuk akal. */
export function sanitizeSettings(value: unknown): PomodoroSettings {
  const v = (value && typeof value === "object" ? value : {}) as Partial<Record<keyof PomodoroSettings, unknown>>;
  const minutes = (n: unknown, fallback: number, max: number) => (typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(1, Math.round(n))) : fallback);
  return {
    focus: minutes(v.focus, DEFAULT_SETTINGS.focus, 120),
    short: minutes(v.short, DEFAULT_SETTINGS.short, 60),
    long: minutes(v.long, DEFAULT_SETTINGS.long, 90),
    longEvery: minutes(v.longEvery, DEFAULT_SETTINGS.longEvery, 12),
    autoStart: typeof v.autoStart === "boolean" ? v.autoStart : DEFAULT_SETTINGS.autoStart,
  };
}
