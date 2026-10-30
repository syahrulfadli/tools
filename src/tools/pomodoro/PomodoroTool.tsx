import { useEffect, useState, useSyncExternalStore } from "react";
import { Minus, Pause, Play, Plus, RotateCcw, SkipForward } from "lucide-react";
import { ToolBar } from "../../components/tool/ToolBar";
import { PanelSection, Toggle } from "../../components/tool/controls";
import { notificationPermission, requestNotifications } from "../timer/lib/alarm";
import { useNow } from "../timer/lib/hooks";
import { ceilToSecond, durationInWords, formatDuration } from "../timer/lib/time";
import { PHASE_LABELS, pomodoroProgress, pomodoroRemaining, type Phase } from "./lib/pomodoro";
import { pomodoroStore } from "./lib/store";
import "../timer/timer.css";
import "./pomodoro.css";

const PHASES: Phase[] = ["focus", "short", "long"];
const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function usePomodoro() {
  return useSyncExternalStore(pomodoroStore.subscribe, pomodoroStore.getSnapshot);
}

export default function PomodoroTool() {
  const { state, settings, justFinished } = usePomodoro();
  const running = state.status === "running";
  const now = useNow(running);
  const remaining = ceilToSecond(pomodoroRemaining(state, now));
  const progress = pomodoroProgress(state, settings, now);
  const text = formatDuration(remaining);
  const label = PHASE_LABELS[state.phase];
  // Nomor sesi fokus di siklus ini; saat istirahat, sesi yang baru selesai.
  const session = state.phase === "focus" ? state.cycle + 1 : state.phase === "long" ? settings.longEvery : state.cycle;

  // Pintasan keyboard. Diabaikan saat mengetik; Spasi di tombol lain tetap milik tombol itu, kecuali tab fase.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.closest('input:not([type="checkbox"]), textarea, select')) return;
      if (event.key === " " && target.closest('button:not([role="tab"]), a, input')) return;
      const key = event.key.toLowerCase();
      if (key === " ") {
        event.preventDefault();
        pomodoroStore.dispatch({ type: pomodoroStore.getSnapshot().state.status === "running" ? "pause" : "start" });
      } else if (key === "r") pomodoroStore.dispatch({ type: "reset" });
      else if (key === "s") pomodoroStore.dispatch({ type: "skip" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const title = state.status !== "idle" ? `${text} · ${label}` : justFinished ? `${PHASE_LABELS[justFinished]} selesai · Pomodoro` : "Pomodoro · Productivity Tools";

  const note = (() => {
    if (running && state.endAt !== null) return `Selesai pukul ${new Date(state.endAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
    if (state.status === "paused") return "Dijeda";
    if (justFinished === "focus") return "Kerja bagus. Saatnya istirahat.";
    if (justFinished) return "Istirahat selesai. Siap fokus lagi?";
    return "Tekan Mulai atau Spasi";
  })();

  return (
    <div className="tool">
      <title>{title}</title>

      <ToolBar
        title="Pomodoro"
        pill={state.status !== "idle" ? `${label}${running ? "" : " · dijeda"}` : undefined}
        status={
          justFinished && state.status === "idle"
            ? `${PHASE_LABELS[justFinished]} selesai. Berikutnya ${label.toLowerCase()} ${settings[state.phase]} menit.`
            : state.completed > 0
              ? `${state.completed} sesi fokus selesai`
              : undefined
        }
      />

      <div className="tool-body tool-body--sidebar">
        <aside className="panel" aria-label="Pengaturan">
          <SettingsSidebar />
        </aside>

        <main className="panel workspace clock">
          <div className="clock-tabs" role="tablist" aria-label="Fase">
            {PHASES.map((phase) => (
              <button
                key={phase}
                type="button"
                role="tab"
                aria-selected={state.phase === phase}
                className={`clock-tab${state.phase === phase ? " is-active" : ""}`}
                disabled={running && state.phase !== phase}
                onClick={() => pomodoroStore.dispatch({ type: "setPhase", phase })}
              >
                {PHASE_LABELS[phase]}
                <span className="clock-tab__live num">{settings[phase]} mnt</span>
              </button>
            ))}
          </div>

          <div role="tabpanel" aria-label={label} className="clock-panel">
            <div className="clock-stage">
              <div className="timer-ring">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                  <circle className="timer-ring__track" cx="50" cy="50" r={RADIUS} />
                  <circle className="timer-ring__value" cx="50" cy="50" r={RADIUS} strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * progress} />
                </svg>
                <div className="timer-ring__content">
                  <p className="pomodoro-phase">{label}</p>
                  <div className="clock-digits num" role="timer" aria-label={`Sisa waktu ${label.toLowerCase()}`}>
                    {text}
                  </div>
                  <p className="clock-note num">{note}</p>
                </div>
              </div>

              <div className="pomodoro-dots" aria-label={`Sesi ${Math.max(1, session)} dari ${settings.longEvery} sebelum istirahat panjang`}>
                {Array.from({ length: settings.longEvery }, (_, i) => (
                  <span
                    key={i}
                    className={`pomodoro-dot${i < state.cycle || state.phase === "long" ? " is-done" : i === state.cycle && state.phase === "focus" ? " is-current" : ""}`}
                  />
                ))}
              </div>

              <div className="clock-controls">
                <button type="button" className="btn clock-btn" onClick={() => pomodoroStore.dispatch({ type: "reset" })} disabled={state.status === "idle"}>
                  <RotateCcw size={16} strokeWidth={1.5} aria-hidden="true" />
                  Reset
                </button>
                {running ? (
                  <button type="button" className="btn btn--primary clock-btn clock-btn--main" onClick={() => pomodoroStore.dispatch({ type: "pause" })}>
                    <Pause size={18} strokeWidth={2} aria-hidden="true" />
                    Jeda
                  </button>
                ) : (
                  <button type="button" className="btn btn--primary clock-btn clock-btn--main" onClick={() => pomodoroStore.dispatch({ type: "start" })}>
                    <Play size={18} strokeWidth={2} aria-hidden="true" />
                    {state.status === "paused" ? "Lanjutkan" : state.phase === "focus" ? "Mulai fokus" : "Mulai istirahat"}
                  </button>
                )}
                <button type="button" className="btn clock-btn" onClick={() => pomodoroStore.dispatch({ type: "skip" })}>
                  <SkipForward size={16} strokeWidth={1.5} aria-hidden="true" />
                  Lewati
                </button>
              </div>
            </div>
          </div>
          <span className="visually-hidden" aria-live="assertive">
            {justFinished && state.status === "idle" ? `${PHASE_LABELS[justFinished]} selesai.` : ""}
          </span>
        </main>
      </div>
    </div>
  );
}

function SettingsSidebar() {
  const { state, settings, alarm } = usePomodoro();
  const [permission, setPermission] = useState(notificationPermission);

  return (
    <>
      <PanelSection title="Durasi">
        <div className="steppers">
          <Stepper label="Fokus" unit="mnt" value={settings.focus} min={1} max={120} onChange={(focus) => pomodoroStore.setSettings({ focus })} />
          <Stepper label="Istirahat pendek" unit="mnt" value={settings.short} min={1} max={60} onChange={(short) => pomodoroStore.setSettings({ short })} />
          <Stepper label="Istirahat panjang" unit="mnt" value={settings.long} min={1} max={90} onChange={(long) => pomodoroStore.setSettings({ long })} />
          <Stepper label="Panjang setiap" unit="sesi" value={settings.longEvery} min={1} max={12} onChange={(longEvery) => pomodoroStore.setSettings({ longEvery })} />
        </div>
        <p className="field-note">
          {state.status === "idle" ? "Klasiknya 25 menit fokus, 5 menit istirahat, dan istirahat panjang setiap 4 sesi." : "Durasi baru berlaku mulai fase berikutnya."}
        </p>
      </PanelSection>

      <PanelSection title="Pergantian fase">
        <Toggle
          label="Mulai fase berikutnya otomatis"
          description="Istirahat langsung berjalan setelah fokus habis, dan sebaliknya."
          checked={settings.autoStart}
          onChange={(autoStart) => pomodoroStore.setSettings({ autoStart })}
        />
        <Toggle label="Suara" description="Bip singkat tiga kali saat fase habis." checked={alarm.sound} onChange={(sound) => pomodoroStore.setAlarm({ sound })} />
        <Toggle
          label="Notifikasi desktop"
          description={
            permission === "unsupported"
              ? "Browser ini tidak mendukung notifikasi."
              : permission === "denied"
                ? "Diblokir browser. Izinkan notifikasi untuk situs ini di pengaturan browser."
                : "Tetap muncul walau tab ini tidak sedang dilihat."
          }
          checked={alarm.notify && permission === "granted"}
          disabled={permission === "unsupported" || permission === "denied"}
          onChange={async (on) => {
            if (on && permission !== "granted") {
              const result = await requestNotifications();
              setPermission(result);
              if (result !== "granted") return;
            }
            pomodoroStore.setAlarm({ notify: on });
          }}
        />
      </PanelSection>

      <PanelSection title="Sesi ini">
        <dl className="summary num">
          <div>
            <dt>Sesi fokus selesai</dt>
            <dd>{state.completed.toLocaleString("id-ID")}</dd>
          </div>
          <div>
            <dt>Total waktu fokus</dt>
            <dd>{state.focused ? durationInWords(state.focused) : "—"}</dd>
          </div>
        </dl>
        <div className="button-row">
          <button type="button" className="btn btn--ghost" disabled={state.completed === 0 && state.phase === "focus" && state.status === "idle"} onClick={pomodoroStore.restart}>
            Mulai siklus baru
          </button>
        </div>
        <p className="field-note">Tetap berjalan saat kamu membuka tool lain. Hitungan sesi hilang bila tab ditutup.</p>
      </PanelSection>

      <PanelSection title="Pintasan keyboard">
        <dl className="shortcuts">
          <div>
            <dt>
              <kbd>Spasi</kbd>
            </dt>
            <dd>Mulai atau jeda</dd>
          </div>
          <div>
            <dt>
              <kbd>S</kbd>
            </dt>
            <dd>Lewati fase</dd>
          </div>
          <div>
            <dt>
              <kbd>R</kbd>
            </dt>
            <dd>Reset fase ini</dd>
          </div>
        </dl>
      </PanelSection>
    </>
  );
}

function Stepper({ label, unit, value, min, max, onChange }: { label: string; unit: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="stepper">
      <span className="stepper__label">{label}</span>
      <div className="stepper__control">
        <button type="button" className="btn btn--icon" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Kurangi ${label.toLowerCase()}`}>
          <Minus size={14} strokeWidth={1.5} />
        </button>
        <output className="num" aria-live="polite" aria-label={label}>
          {value} {unit}
        </output>
        <button type="button" className="btn btn--icon" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`Tambah ${label.toLowerCase()}`}>
          <Plus size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
