/**
 * Store Pomodoro di memori modul (bukan React state), supaya siklus tetap berjalan saat user
 * membuka tool lain lalu kembali, seperti Timer. Hanya setelan (durasi, otomatis, alarm) yang
 * disimpan di localStorage; hitungan sesi hilang saat tab ditutup.
 */
import { readJson, writeJson } from "../../../lib/storage";
import { notify, playPattern, unlockAudio, vibrate } from "../../timer/lib/alarm";
import { PHASE_LABELS, initialPomodoro, pomodoroReducer, sanitizeSettings, type Phase, type PomodoroAction, type PomodoroSettings, type PomodoroState } from "./pomodoro";

export interface AlarmSettings {
  sound: boolean;
  notify: boolean;
}

export interface PomodoroSnapshot {
  state: PomodoroState;
  settings: PomodoroSettings;
  alarm: AlarmSettings;
  /** Fase yang baru saja habis, untuk pesan status sampai fase berikutnya dimulai. */
  justFinished: Phase | null;
}

const SETTINGS_KEY = "pomodoro:settings";
/** Bunyi berulang beberapa kali saja: pergantian fase bukan alarm darurat. */
const CHIME_REPEAT = 3;

function loadSettings() {
  const stored = readJson(SETTINGS_KEY) as (Partial<PomodoroSettings & AlarmSettings> & object) | null;
  return {
    settings: sanitizeSettings(stored),
    alarm: { sound: stored?.sound !== false, notify: stored?.notify === true },
  };
}

const loaded = loadSettings();
let snapshot: PomodoroSnapshot = { state: initialPomodoro(loaded.settings), settings: loaded.settings, alarm: loaded.alarm, justFinished: null };
const listeners = new Set<() => void>();
let finishTimeout: ReturnType<typeof setTimeout> | undefined;
let chimeInterval: ReturnType<typeof setInterval> | undefined;

function set(next: Partial<PomodoroSnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function save() {
  writeJson(SETTINGS_KEY, { ...snapshot.settings, ...snapshot.alarm });
}

function scheduleFinish() {
  clearTimeout(finishTimeout);
  const { state } = snapshot;
  if (state.status !== "running" || state.endAt === null) return;
  // Timeout bisa diperlambat browser di tab latar; cek ulang sampai fase benar-benar habis.
  finishTimeout = setTimeout(
    () => {
      const before = snapshot.state;
      const next = pomodoroReducer(before, { type: "finish" }, snapshot.settings, Date.now());
      if (next === before) return scheduleFinish();
      set({ state: next, justFinished: before.phase });
      chime(before.phase, next);
      scheduleFinish();
    },
    Math.max(0, state.endAt - Date.now()),
  );
}

function chime(finished: Phase, next: PomodoroState) {
  clearInterval(chimeInterval);
  if (snapshot.alarm.sound) {
    let left = CHIME_REPEAT;
    playPattern();
    chimeInterval = setInterval(() => (--left > 0 ? playPattern() : clearInterval(chimeInterval)), 1000);
  }
  vibrate();
  if (snapshot.alarm.notify) {
    const title = finished === "focus" ? "Sesi fokus selesai" : "Istirahat selesai";
    const minutes = snapshot.settings[next.phase];
    const body = `${next.status === "running" ? "Mulai" : "Berikutnya"}: ${PHASE_LABELS[next.phase].toLowerCase()} ${minutes} menit.`;
    notify(title, body, "productivity-tools-pomodoro");
  }
}

function dispatch(action: PomodoroAction) {
  if (action.type === "start") unlockAudio();
  if (action.type !== "finish") clearInterval(chimeInterval);
  set({ state: pomodoroReducer(snapshot.state, action, snapshot.settings, Date.now()), justFinished: action.type === "pause" ? snapshot.justFinished : null });
  scheduleFinish();
}

export const pomodoroStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => snapshot,
  dispatch,
  setSettings(patch: Partial<PomodoroSettings>) {
    const settings = sanitizeSettings({ ...snapshot.settings, ...patch });
    set({ settings, state: pomodoroReducer(snapshot.state, { type: "settings", settings }, settings, Date.now()) });
    save();
  },
  setAlarm(patch: Partial<AlarmSettings>) {
    set({ alarm: { ...snapshot.alarm, ...patch } });
    if (patch.sound === false) clearInterval(chimeInterval);
    save();
  },
  /** Kosongkan hitungan sesi dan mulai lagi dari fokus. */
  restart() {
    clearInterval(chimeInterval);
    set({ state: initialPomodoro(snapshot.settings), justFinished: null });
    scheduleFinish();
  },
};
