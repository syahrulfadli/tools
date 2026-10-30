/**
 * Store timer & stopwatch di memori modul (bukan React state), supaya keduanya tetap
 * berjalan saat user pindah ke tool lain lalu kembali. Tidak ada yang disimpan ke
 * server atau penyimpanan browser: me-reload tab menghapus semuanya.
 */
import { notify, playPattern, unlockAudio, vibrate } from "./alarm";
import { initialStopwatch, stopwatchReducer, type StopwatchAction, type StopwatchState } from "./stopwatch";
import { MINUTE, durationInWords } from "./time";
import { initialTimer, timerReducer, type TimerAction, type TimerState } from "./timer";

export interface ClockSettings {
  sound: boolean;
  notify: boolean;
}

export interface ClockSnapshot {
  timer: TimerState;
  stopwatch: StopwatchState;
  /** Alarm sedang berbunyi. */
  ringing: boolean;
  settings: ClockSettings;
}

/** Alarm berhenti sendiri setelah 60 detik bila tidak dimatikan. */
const ALARM_LIMIT = 60_000;

let snapshot: ClockSnapshot = {
  timer: initialTimer(5 * MINUTE),
  stopwatch: initialStopwatch,
  ringing: false,
  settings: { sound: true, notify: false },
};
const listeners = new Set<() => void>();
let finishTimeout: ReturnType<typeof setTimeout> | undefined;
let alarmInterval: ReturnType<typeof setInterval> | undefined;
let alarmTimeout: ReturnType<typeof setTimeout> | undefined;

function set(next: Partial<ClockSnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function scheduleFinish() {
  clearTimeout(finishTimeout);
  const { timer } = snapshot;
  if (timer.status !== "running" || timer.endAt === null) return;
  // Timeout bisa diperlambat browser di tab latar; cek ulang sampai waktunya benar-benar habis.
  finishTimeout = setTimeout(() => {
    const finished = timerReducer(snapshot.timer, { type: "finish" }, Date.now());
    if (finished === snapshot.timer) return scheduleFinish();
    set({ timer: finished });
    startAlarm();
  }, Math.max(0, timer.endAt - Date.now()));
}

function startAlarm() {
  stopAlarm();
  set({ ringing: true });
  if (snapshot.settings.sound) {
    playPattern();
    alarmInterval = setInterval(playPattern, 1000);
  }
  vibrate();
  if (snapshot.settings.notify) notify("Waktu habis", `Timer ${durationInWords(snapshot.timer.duration)} selesai.`);
  alarmTimeout = setTimeout(stopAlarm, ALARM_LIMIT);
}

function stopAlarm() {
  clearInterval(alarmInterval);
  clearTimeout(alarmTimeout);
  if (snapshot.ringing) set({ ringing: false });
}

function timer(action: TimerAction) {
  if (action.type === "start" || action.type === "addTime") unlockAudio();
  if (action.type !== "addTime" || snapshot.timer.status === "finished") stopAlarm();
  set({ timer: timerReducer(snapshot.timer, action, Date.now()) });
  scheduleFinish();
}

function stopwatch(action: StopwatchAction) {
  set({ stopwatch: stopwatchReducer(snapshot.stopwatch, action, Date.now()) });
}

export const clockStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => snapshot,
  timer,
  stopwatch,
  stopAlarm,
  setSettings(patch: Partial<ClockSettings>) {
    set({ settings: { ...snapshot.settings, ...patch } });
    if (patch.sound === false) clearInterval(alarmInterval);
  },
};
