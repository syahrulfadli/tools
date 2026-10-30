import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Copy } from "lucide-react";
import { ToolBar } from "../../components/tool/ToolBar";
import { PanelSection, Toggle } from "../../components/tool/controls";
import { StopwatchFace } from "./components/StopwatchFace";
import { TIMER_PRESETS, TimerFace } from "./components/TimerFace";
import { notificationPermission, requestNotifications } from "./lib/alarm";
import { useClock, useNow } from "./lib/hooks";
import { lapAverage, lapRows, stopwatchElapsed } from "./lib/stopwatch";
import { clockStore } from "./lib/store";
import { ceilToSecond, formatDuration } from "./lib/time";
import { timerRemaining } from "./lib/timer";
import "./timer.css";

type Mode = "timer" | "stopwatch";

export default function TimerTool() {
  // Mode disimpan sebagai state lokal agar langsung berlaku (pembaruan URL React Router berjalan
  // sebagai transition dan bisa tertunda); URL ?mode= hanya disinkronkan untuk tautan.
  const [params, setParams] = useSearchParams();
  const [mode, setModeState] = useState<Mode>(() => (params.get("mode") === "stopwatch" ? "stopwatch" : "timer"));
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const setMode = (next: Mode) => {
    modeRef.current = next;
    setModeState(next);
    setParams(next === "timer" ? {} : { mode: next }, { replace: true });
  };

  const snapshot = useClock();
  const { timer, stopwatch, ringing } = snapshot;
  const timerRunning = timer.status === "running";
  const stopwatchRunning = stopwatch.status === "running";
  const now = useNow(timerRunning || stopwatchRunning || timer.status === "finished");

  const timerText = formatDuration(ceilToSecond(timerRemaining(timer, now)));
  const stopwatchText = formatDuration(stopwatchElapsed(stopwatch, now));

  // Pintasan keyboard. Diabaikan saat mengetik di kolom isian. Spasi di tombol atau sakelar
  // tetap milik elemen itu, kecuali tab mode (setelah klik tab, Spasi langsung mulai/jeda).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.closest('input:not([type="checkbox"]), textarea, select')) return;
      if (event.key === " " && target.closest('button:not([role="tab"]), a, input')) return;
      const { timer, stopwatch, ringing } = clockStore.getSnapshot();
      const mode = modeRef.current;
      const key = event.key.toLowerCase();
      if (key === "escape" && ringing) clockStore.stopAlarm();
      else if (key === " ") {
        event.preventDefault();
        if (mode === "timer") {
          if (ringing) clockStore.stopAlarm();
          else clockStore.timer({ type: timer.status === "running" ? "pause" : "start" });
        } else clockStore.stopwatch({ type: stopwatch.status === "running" ? "pause" : "start" });
      } else if (key === "r") {
        if (mode === "timer") clockStore.timer({ type: "reset" });
        else clockStore.stopwatch({ type: "reset" });
      } else if (key === "l" && mode === "stopwatch") clockStore.stopwatch({ type: "lap" });
      else if ((key === "+" || key === "=") && mode === "timer") clockStore.timer({ type: "addTime", amount: 60_000 });
      else return;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const title =
    timer.status === "finished"
      ? "Waktu habis · Timer"
      : mode === "timer" && timer.status !== "idle"
        ? `${timerText} · Timer`
        : mode === "stopwatch" && stopwatch.status !== "idle"
          ? `${stopwatchText} · Stopwatch`
          : "Timer & Stopwatch · Productivity Tools";

  return (
    <div className="tool">
      <title>{title}</title>

      <ToolBar
        title="Timer & Stopwatch"
        pill={timer.status === "finished" ? "Waktu habis" : timerRunning ? "Timer berjalan" : stopwatchRunning ? "Stopwatch berjalan" : undefined}
        status={ringing ? <span className="tool-bar__error">Alarm berbunyi. Tekan Spasi atau Esc untuk mematikan.</span> : undefined}
      />

      <div className="tool-body tool-body--sidebar">
        <aside className="panel" aria-label="Pengaturan">
          {mode === "timer" ? <TimerSidebar /> : <StopwatchSidebar />}
          <PanelSection title="Pintasan keyboard">
            <dl className="shortcuts">
              <div>
                <dt>
                  <kbd>Spasi</kbd>
                </dt>
                <dd>{mode === "timer" ? "Mulai, jeda, matikan alarm" : "Mulai atau jeda"}</dd>
              </div>
              {mode === "stopwatch" && (
                <div>
                  <dt>
                    <kbd>L</kbd>
                  </dt>
                  <dd>Catat putaran</dd>
                </div>
              )}
              {mode === "timer" && (
                <div>
                  <dt>
                    <kbd>+</kbd>
                  </dt>
                  <dd>Tambah 1 menit</dd>
                </div>
              )}
              <div>
                <dt>
                  <kbd>R</kbd>
                </dt>
                <dd>Reset</dd>
              </div>
            </dl>
          </PanelSection>
        </aside>

        <main className="panel workspace clock">
          <div className="clock-tabs" role="tablist" aria-label="Mode">
            <ModeTab active={mode === "timer"} onClick={() => setMode("timer")} label="Timer" live={timer.status !== "idle" ? (timer.status === "finished" ? "habis" : timerText) : undefined} />
            <ModeTab
              active={mode === "stopwatch"}
              onClick={() => setMode("stopwatch")}
              label="Stopwatch"
              live={stopwatch.status !== "idle" ? stopwatchText : undefined}
            />
          </div>
          <div role="tabpanel" aria-label={mode === "timer" ? "Timer" : "Stopwatch"} className="clock-panel">
            {mode === "timer" ? <TimerFace snapshot={snapshot} now={now} /> : <StopwatchFace snapshot={snapshot} now={now} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function ModeTab({ active, label, live, onClick }: { active: boolean; label: string; live?: string; onClick: () => void }) {
  return (
    <button type="button" role="tab" aria-selected={active} className={`clock-tab${active ? " is-active" : ""}`} onClick={onClick}>
      {label}
      {live && <span className="clock-tab__live num">{live}</span>}
    </button>
  );
}

function TimerSidebar() {
  const { timer, settings } = useClock();
  const [permission, setPermission] = useState(notificationPermission);
  const locked = timer.status === "running";

  return (
    <>
      <PanelSection title="Preset">
        <div className="presets">
          {TIMER_PRESETS.map((preset) => {
            const active = timer.duration === preset.ms && timer.status !== "finished";
            return (
              <button
                key={preset.minutes}
                type="button"
                className={`chip${active ? " is-active" : ""}`}
                aria-pressed={active}
                disabled={locked}
                onClick={() => clockStore.timer({ type: "setDuration", duration: preset.ms })}
              >
                {preset.label}
                {preset.minutes === 25 && <span className="num">Pomodoro</span>}
              </button>
            );
          })}
        </div>
        {locked && <p className="field-note">Jeda atau reset timer untuk mengganti durasi.</p>}
      </PanelSection>

      <PanelSection title="Alarm">
        <Toggle
          label="Suara"
          description="Bip tiga kali tiap detik, berhenti sendiri setelah 1 menit."
          checked={settings.sound}
          onChange={(sound) => clockStore.setSettings({ sound })}
        />
        <Toggle
          label="Notifikasi desktop"
          description={
            permission === "unsupported"
              ? "Browser ini tidak mendukung notifikasi."
              : permission === "denied"
                ? "Diblokir browser. Izinkan notifikasi untuk situs ini di pengaturan browser."
                : "Tetap muncul walau tab ini tidak sedang dilihat."
          }
          checked={settings.notify && permission === "granted"}
          disabled={permission === "unsupported" || permission === "denied"}
          onChange={async (on) => {
            if (on && permission !== "granted") {
              const result = await requestNotifications();
              setPermission(result);
              if (result !== "granted") return;
            }
            clockStore.setSettings({ notify: on });
          }}
        />
        <p className="field-note">Timer tetap berjalan saat kamu membuka tool lain, tapi berhenti bila tab ditutup atau dimuat ulang.</p>
      </PanelSection>
    </>
  );
}

function StopwatchSidebar() {
  const { stopwatch } = useClock();
  const [copied, setCopied] = useState(false);
  const rows = lapRows(stopwatch.splits);
  const fastest = rows.find((row) => row.mark === "fastest");
  const slowest = rows.find((row) => row.mark === "slowest");
  const fmt = (ms: number) => formatDuration(ms, { centis: true });

  async function copyLaps() {
    const text = ["Putaran\tWaktu putaran\tTotal", ...[...rows].reverse().map((row) => `${row.number}\t${fmt(row.lap)}\t${fmt(row.total)}`)].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <PanelSection title="Putaran" aside={rows.length ? `${rows.length} dicatat` : undefined}>
      {rows.length === 0 ? (
        <p className="field-note">Tekan Putaran (atau L) saat stopwatch berjalan untuk mencatat waktu per putaran.</p>
      ) : (
        <>
          <dl className="summary num">
            <div>
              <dt>Rata-rata</dt>
              <dd>{fmt(lapAverage(stopwatch.splits))}</dd>
            </div>
            <div>
              <dt>Tercepat</dt>
              <dd>{fastest ? `${fmt(fastest.lap)} (ke-${fastest.number})` : "—"}</dd>
            </div>
            <div>
              <dt>Terlama</dt>
              <dd>{slowest ? `${fmt(slowest.lap)} (ke-${slowest.number})` : "—"}</dd>
            </div>
          </dl>
          <div className="button-row">
            <button type="button" className="btn" onClick={copyLaps}>
              <Copy size={14} strokeWidth={1.5} aria-hidden="true" />
              {copied ? "Tersalin" : "Salin daftar putaran"}
            </button>
          </div>
        </>
      )}
    </PanelSection>
  );
}
