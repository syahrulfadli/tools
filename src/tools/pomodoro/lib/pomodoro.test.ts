import { describe, expect, it } from "vitest";
import { MINUTE } from "../../timer/lib/time";
import { DEFAULT_SETTINGS, initialPomodoro, pomodoroProgress, pomodoroReducer, pomodoroRemaining, sanitizeSettings, type PomodoroAction, type PomodoroState } from "./pomodoro";

const settings = { ...DEFAULT_SETTINGS, longEvery: 2 };

function run(state: PomodoroState, actions: [PomodoroAction, number][], s = settings) {
  return actions.reduce((current, [action, now]) => pomodoroReducer(current, action, s, now), state);
}

/** Jalankan satu fase penuh dari `now`. */
function complete(state: PomodoroState, now: number, s = settings) {
  const started = pomodoroReducer(state, { type: "start" }, s, now);
  return pomodoroReducer(started, { type: "finish" }, s, started.endAt ?? now);
}

describe("pomodoro", () => {
  it("mulai dari fokus 25 menit", () => {
    const state = initialPomodoro(settings);
    expect(state.phase).toBe("focus");
    expect(pomodoroRemaining(state, 0)).toBe(25 * MINUTE);
  });

  it("menghitung mundur dari stempel waktu dan bisa dijeda", () => {
    const state = run(initialPomodoro(settings), [
      [{ type: "start" }, 0],
      [{ type: "pause" }, 10 * MINUTE],
    ]);
    expect(state.status).toBe("paused");
    expect(pomodoroRemaining(state, 99 * MINUTE)).toBe(15 * MINUTE);
    expect(pomodoroProgress(state, settings, 0)).toBeCloseTo(0.4);
  });

  it("tidak selesai sebelum waktunya", () => {
    const started = pomodoroReducer(initialPomodoro(settings), { type: "start" }, settings, 0);
    expect(pomodoroReducer(started, { type: "finish" }, settings, 24 * MINUTE)).toBe(started);
  });

  it("fokus → pendek → fokus → panjang, lalu siklus mulai lagi", () => {
    let state = initialPomodoro(settings);
    const phases: string[] = [];
    for (let i = 0; i < 5; i++) {
      state = complete(state, i * 60 * MINUTE);
      phases.push(state.phase);
    }
    expect(phases).toEqual(["short", "focus", "long", "focus", "short"]);
    expect(state.completed).toBe(3);
    expect(state.focused).toBe(3 * 25 * MINUTE);
    expect(state.cycle).toBe(1);
  });

  it("fase berikutnya menunggu tombol Mulai kecuali mode otomatis", () => {
    expect(complete(initialPomodoro(settings), 0).status).toBe("idle");
    const auto = { ...settings, autoStart: true };
    const next = complete(initialPomodoro(auto), 0, auto);
    expect(next.status).toBe("running");
    expect(next.endAt).toBe(25 * MINUTE + 5 * MINUTE);
  });

  it("melewati fokus tidak dihitung sebagai sesi selesai", () => {
    const state = pomodoroReducer(initialPomodoro(settings), { type: "skip" }, settings, 0);
    expect(state.phase).toBe("short");
    expect(state.completed).toBe(0);
    expect(state.status).toBe("idle");
  });

  it("durasi baru berlaku untuk fase yang belum dimulai saja", () => {
    const longer = { ...settings, focus: 50 };
    expect(pomodoroReducer(initialPomodoro(settings), { type: "settings", settings: longer }, longer, 0).remaining).toBe(50 * MINUTE);
    const running = pomodoroReducer(initialPomodoro(settings), { type: "start" }, settings, 0);
    expect(pomodoroReducer(running, { type: "settings", settings: longer }, longer, 0).endAt).toBe(25 * MINUTE);
  });

  it("pindah fase manual hanya saat tidak berjalan", () => {
    const state = pomodoroReducer(initialPomodoro(settings), { type: "setPhase", phase: "long" }, settings, 0);
    expect(state.phase).toBe("long");
    expect(state.remaining).toBe(15 * MINUTE);
    const running = pomodoroReducer(state, { type: "start" }, settings, 0);
    expect(pomodoroReducer(running, { type: "setPhase", phase: "focus" }, settings, 0)).toBe(running);
  });
});

describe("sanitizeSettings", () => {
  it("mengisi nilai bawaan dan menjepit rentang", () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ focus: 500, short: 0, long: "x", longEvery: 3.6, autoStart: true })).toEqual({ focus: 120, short: 1, long: 15, longEvery: 4, autoStart: true });
  });
});
