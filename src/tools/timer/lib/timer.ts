/**
 * State timer (hitung mundur). Semua waktu berupa stempel `Date.now()` sehingga tetap
 * benar walau tab di latar atau perangkat sempat tidur: sisa waktu = endAt − sekarang.
 */
import { MAX_TIMER } from "./time";

export type TimerStatus = "idle" | "running" | "paused" | "finished";

export interface TimerState {
  status: TimerStatus;
  /** Panjang putaran ini, untuk cincin progres. */
  duration: number;
  /** Saat waktu habis (hanya bermakna saat berjalan atau selesai). */
  endAt: number | null;
  /** Sisa waktu saat diam atau dijeda. */
  remaining: number;
}

export type TimerAction =
  | { type: "start" }
  | { type: "pause" }
  | { type: "reset" }
  | { type: "finish" }
  | { type: "setDuration"; duration: number }
  | { type: "addTime"; amount: number };

export function initialTimer(duration: number): TimerState {
  return { status: "idle", duration, endAt: null, remaining: duration };
}

export function timerRemaining(state: TimerState, now: number) {
  if (state.status === "running" && state.endAt !== null) return Math.max(0, state.endAt - now);
  if (state.status === "finished") return 0;
  return state.remaining;
}

/** Berapa lama sudah lewat sejak waktu habis. */
export function timerOvertime(state: TimerState, now: number) {
  return state.status === "finished" && state.endAt !== null ? Math.max(0, now - state.endAt) : 0;
}

/** 0 → baru mulai, 1 → habis. */
export function timerProgress(state: TimerState, now: number) {
  if (state.duration <= 0) return 0;
  return 1 - timerRemaining(state, now) / state.duration;
}

export function timerReducer(state: TimerState, action: TimerAction, now: number): TimerState {
  switch (action.type) {
    case "start": {
      if (state.status === "running") return state;
      const remaining = state.status === "finished" ? state.duration : state.remaining;
      if (remaining <= 0) return state;
      return { ...state, status: "running", remaining, endAt: now + remaining };
    }
    case "pause":
      if (state.status !== "running") return state;
      return { ...state, status: "paused", remaining: timerRemaining(state, now), endAt: null };
    case "reset":
      return initialTimer(state.duration);
    case "finish":
      if (state.status !== "running" || state.endAt === null || now < state.endAt) return state;
      return { ...state, status: "finished", remaining: 0 };
    case "setDuration": {
      if (state.status === "running") return state;
      const duration = clampDuration(action.duration);
      return initialTimer(duration);
    }
    case "addTime": {
      if (state.status === "running" && state.endAt !== null) {
        const remaining = timerRemaining(state, now);
        const extra = Math.min(action.amount, MAX_TIMER - remaining);
        return { ...state, endAt: state.endAt + extra, duration: state.duration + extra };
      }
      if (state.status === "finished") {
        // Tunda alarm: jalan lagi selama `amount`.
        return { status: "running", duration: action.amount, remaining: action.amount, endAt: now + action.amount };
      }
      const remaining = clampDuration(state.remaining + action.amount);
      return { ...state, remaining, duration: state.status === "idle" ? remaining : state.duration + (remaining - state.remaining) };
    }
  }
}

function clampDuration(ms: number) {
  return Math.min(MAX_TIMER, Math.max(0, Math.round(ms)));
}
