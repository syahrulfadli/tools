/** State stopwatch. Waktu berjalan = akumulasi + (sekarang − startedAt) saat berjalan. */

export type StopwatchStatus = "idle" | "running" | "paused";

export interface StopwatchState {
  status: StopwatchStatus;
  startedAt: number | null;
  /** Waktu terkumpul sebelum `startedAt`. */
  accumulated: number;
  /** Total waktu berjalan pada setiap tombol Putaran, urut naik. */
  splits: number[];
}

export type StopwatchAction = { type: "start" } | { type: "pause" } | { type: "reset" } | { type: "lap" };

export const initialStopwatch: StopwatchState = { status: "idle", startedAt: null, accumulated: 0, splits: [] };

export function stopwatchElapsed(state: StopwatchState, now: number) {
  return state.accumulated + (state.status === "running" && state.startedAt !== null ? Math.max(0, now - state.startedAt) : 0);
}

export function stopwatchReducer(state: StopwatchState, action: StopwatchAction, now: number): StopwatchState {
  switch (action.type) {
    case "start":
      if (state.status === "running") return state;
      return { ...state, status: "running", startedAt: now };
    case "pause":
      if (state.status !== "running") return state;
      return { ...state, status: "paused", accumulated: stopwatchElapsed(state, now), startedAt: null };
    case "reset":
      return initialStopwatch;
    case "lap":
      if (state.status !== "running") return state;
      return { ...state, splits: [...state.splits, stopwatchElapsed(state, now)] };
  }
}

export interface LapRow {
  /** Nomor putaran, mulai 1. */
  number: number;
  lap: number;
  total: number;
  mark?: "fastest" | "slowest";
}

/** Baris putaran, terbaru di atas. Tercepat/terlama ditandai bila ada minimal 2 putaran berbeda. */
export function lapRows(splits: number[]): LapRow[] {
  const rows = splits.map((total, i) => ({ number: i + 1, total, lap: total - (splits[i - 1] ?? 0) }) as LapRow);
  if (rows.length >= 2) {
    const laps = rows.map((row) => row.lap);
    const min = Math.min(...laps);
    const max = Math.max(...laps);
    if (min !== max) {
      rows.find((row) => row.lap === min)!.mark = "fastest";
      rows.find((row) => row.lap === max)!.mark = "slowest";
    }
  }
  return rows.reverse();
}

export function lapAverage(splits: number[]) {
  return splits.length ? splits[splits.length - 1] / splits.length : 0;
}
