import { BellOff, Pause, Play, Plus, RotateCcw } from "lucide-react";
import { clockStore, type ClockSnapshot } from "../lib/store";
import { MINUTE, ceilToSecond, formatDuration, splitDuration, toMs } from "../lib/time";
import { timerOvertime, timerProgress, timerRemaining } from "../lib/timer";
import { TimeField } from "./TimeField";

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const two = (n: number) => String(n).padStart(2, "0"); // taste-skill-ignore: digit jam

/** Muka timer: cincin progres, angka besar (bisa diketik saat diam), dan tombol. */
export function TimerFace({ snapshot, now }: { snapshot: ClockSnapshot; now: number }) {
  const { timer, ringing } = snapshot;
  const editable = timer.status === "idle";
  const finished = timer.status === "finished";
  const remaining = ceilToSecond(timerRemaining(timer, now));
  const parts = splitDuration(editable ? timer.duration : remaining);
  const progress = finished ? 1 : timerProgress(timer, now);

  const setPart = (part: "hours" | "minutes" | "seconds", value: number) => {
    const next = { ...splitDuration(timer.duration), [part]: value };
    clockStore.timer({ type: "setDuration", duration: toMs(next.hours, next.minutes, next.seconds) });
  };

  const note = (() => {
    if (finished) return `Lewat ${formatDuration(timerOvertime(timer, now))}`;
    if (timer.status === "running" && timer.endAt !== null)
      return `Selesai pukul ${new Date(timer.endAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
    if (timer.status === "paused") return "Dijeda";
    return timer.duration > 0 ? "Ketik angka atau pilih preset" : "Atur durasi dulu";
  })();

  return (
    <div className={`clock-stage timer-face${finished ? " is-finished" : ""}`}>
      <div className="timer-ring">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="timer-ring__track" cx="50" cy="50" r={RADIUS} />
          <circle
            className="timer-ring__value"
            cx="50"
            cy="50"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * progress}
          />
        </svg>
        <div className="timer-ring__content">
          {finished ? (
            <p className="clock-title">Waktu habis</p>
          ) : (
            <div className="clock-digits num" role="timer" aria-label="Sisa waktu">
              {editable ? (
                <>
                  <TimeField label="Jam" value={parts.hours} max={99} onCommit={(v) => setPart("hours", v)} />
                  <span className="clock-digits__sep">:</span>
                  <TimeField label="Menit" value={parts.minutes} max={59} onCommit={(v) => setPart("minutes", v)} />
                  <span className="clock-digits__sep">:</span>
                  <TimeField label="Detik" value={parts.seconds} max={59} onCommit={(v) => setPart("seconds", v)} />
                </>
              ) : (
                <>
                  <span className="clock-digits__group">{two(parts.hours)}</span>
                  <span className="clock-digits__sep">:</span>
                  <span className="clock-digits__group">{two(parts.minutes)}</span>
                  <span className="clock-digits__sep">:</span>
                  <span className="clock-digits__group">{two(parts.seconds)}</span>
                </>
              )}
            </div>
          )}
          {editable && (
            <div className="clock-units" aria-hidden="true">
              <span>jam</span>
              <span>menit</span>
              <span>detik</span>
            </div>
          )}
          <p className="clock-note num">{note}</p>
        </div>
      </div>

      <div className="clock-controls">
        <button
          type="button"
          className="btn clock-btn"
          onClick={() => clockStore.timer({ type: "reset" })}
          disabled={timer.status === "idle"}
        >
          <RotateCcw size={16} strokeWidth={1.5} aria-hidden="true" />
          Reset
        </button>
        {ringing ? (
          <button type="button" className="btn btn--primary clock-btn clock-btn--main" onClick={clockStore.stopAlarm}>
            <BellOff size={18} strokeWidth={2} aria-hidden="true" />
            Matikan alarm
          </button>
        ) : timer.status === "running" ? (
          <button type="button" className="btn btn--primary clock-btn clock-btn--main" onClick={() => clockStore.timer({ type: "pause" })}>
            <Pause size={18} strokeWidth={2} aria-hidden="true" />
            Jeda
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary clock-btn clock-btn--main"
            onClick={() => clockStore.timer({ type: "start" })}
            disabled={timer.duration <= 0}
          >
            <Play size={18} strokeWidth={2} aria-hidden="true" />
            {timer.status === "paused" ? "Lanjutkan" : finished ? "Mulai lagi" : "Mulai"}
          </button>
        )}
        <button
          type="button"
          className="btn clock-btn"
          onClick={() => clockStore.timer({ type: "addTime", amount: MINUTE })}
        >
          <Plus size={16} strokeWidth={1.5} aria-hidden="true" />1 menit
        </button>
      </div>
      <span className="visually-hidden" aria-live="assertive">
        {finished ? "Waktu habis." : ""}
      </span>
    </div>
  );
}

export const TIMER_PRESETS = [1, 3, 5, 10, 15, 25, 30, 45, 60].map((minutes) => ({
  minutes,
  ms: minutes * MINUTE,
  label: minutes === 60 ? "1 jam" : `${minutes} mnt`,
}));

