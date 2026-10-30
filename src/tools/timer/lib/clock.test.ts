import { describe, expect, it } from "vitest";
import { ceilToSecond, durationInWords, formatDuration, MAX_TIMER, toMs } from "./time";
import { initialTimer, timerOvertime, timerProgress, timerReducer, timerRemaining } from "./timer";
import { initialStopwatch, lapAverage, lapRows, stopwatchElapsed, stopwatchReducer } from "./stopwatch";

describe("format waktu", () => {
  it("menulis jam hanya bila perlu", () => {
    expect(formatDuration(5 * 60_000 + 9_000)).toBe("05:09");
    expect(formatDuration(3_909_000)).toBe("1:05:09");
    expect(formatDuration(9_420, { centis: true })).toBe("00:09.42");
    expect(formatDuration(0, { forceHours: true })).toBe("0:00:00");
  });

  it("membulatkan sisa ke atas dan menulis kata", () => {
    expect(ceilToSecond(4_200)).toBe(5_000);
    expect(ceilToSecond(5_000)).toBe(5_000);
    expect(durationInWords(3_900_000)).toBe("1 jam 5 menit");
    expect(durationInWords(0)).toBe("0 detik");
  });

  it("membatasi durasi timer", () => {
    expect(toMs(120, 0, 0)).toBe(MAX_TIMER);
    expect(toMs(0, 25, 0)).toBe(1_500_000);
  });
});

describe("timer", () => {
  const t0 = 1_000_000;

  it("berjalan, dijeda, dilanjutkan tanpa kehilangan waktu", () => {
    let s = timerReducer(initialTimer(60_000), { type: "start" }, t0);
    expect(timerRemaining(s, t0 + 10_000)).toBe(50_000);
    s = timerReducer(s, { type: "pause" }, t0 + 10_000);
    expect(timerRemaining(s, t0 + 99_000)).toBe(50_000);
    s = timerReducer(s, { type: "start" }, t0 + 100_000);
    expect(timerRemaining(s, t0 + 120_000)).toBe(30_000);
    expect(timerProgress(s, t0 + 120_000)).toBeCloseTo(0.5);
  });

  it("selesai hanya setelah waktunya habis, lalu menghitung waktu lewat", () => {
    let s = timerReducer(initialTimer(5_000), { type: "start" }, t0);
    expect(timerReducer(s, { type: "finish" }, t0 + 4_999).status).toBe("running");
    s = timerReducer(s, { type: "finish" }, t0 + 5_000);
    expect(s.status).toBe("finished");
    expect(timerOvertime(s, t0 + 17_000)).toBe(12_000);
  });

  it("+1 menit saat berjalan menambah sisa; saat selesai menjalankan ulang 1 menit", () => {
    let s = timerReducer(initialTimer(60_000), { type: "start" }, t0);
    s = timerReducer(s, { type: "addTime", amount: 60_000 }, t0 + 30_000);
    expect(timerRemaining(s, t0 + 30_000)).toBe(90_000);
    s = timerReducer(s, { type: "finish" }, t0 + 120_000);
    s = timerReducer(s, { type: "addTime", amount: 60_000 }, t0 + 125_000);
    expect(s.status).toBe("running");
    expect(timerRemaining(s, t0 + 125_000)).toBe(60_000);
  });

  it("durasi tidak bisa diubah saat berjalan, dan durasi nol tidak bisa dimulai", () => {
    const running = timerReducer(initialTimer(60_000), { type: "start" }, t0);
    expect(timerReducer(running, { type: "setDuration", duration: 5_000 }, t0)).toBe(running);
    const zero = initialTimer(0);
    expect(timerReducer(zero, { type: "start" }, t0)).toBe(zero);
  });
});

describe("stopwatch", () => {
  const t0 = 5_000;

  it("mengakumulasi waktu di antara jeda", () => {
    let s = stopwatchReducer(initialStopwatch, { type: "start" }, t0);
    s = stopwatchReducer(s, { type: "pause" }, t0 + 1_500);
    s = stopwatchReducer(s, { type: "start" }, t0 + 10_000);
    expect(stopwatchElapsed(s, t0 + 10_250)).toBe(1_750);
  });

  it("mencatat putaran dan menandai tercepat/terlama", () => {
    let s = stopwatchReducer(initialStopwatch, { type: "start" }, 0);
    for (const at of [10_000, 18_000, 30_000]) s = stopwatchReducer(s, { type: "lap" }, at);
    const rows = lapRows(s.splits);
    expect(rows.map((r) => [r.number, r.lap, r.total, r.mark])).toEqual([
      [3, 12_000, 30_000, "slowest"],
      [2, 8_000, 18_000, "fastest"],
      [1, 10_000, 10_000, undefined],
    ]);
    expect(lapAverage(s.splits)).toBe(10_000);
  });

  it("tidak mencatat putaran saat tidak berjalan", () => {
    expect(stopwatchReducer(initialStopwatch, { type: "lap" }, 100).splits).toEqual([]);
  });
});
