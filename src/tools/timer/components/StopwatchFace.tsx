import { Flag, Pause, Play, RotateCcw } from "lucide-react";
import { clockStore, type ClockSnapshot } from "../lib/store";
import { lapRows, stopwatchElapsed } from "../lib/stopwatch";
import { formatDuration } from "../lib/time";

/** Muka stopwatch: angka besar dengan seperseratus detik, tombol, dan tabel putaran. */
export function StopwatchFace({ snapshot, now }: { snapshot: ClockSnapshot; now: number }) {
  const { stopwatch } = snapshot;
  const elapsed = stopwatchElapsed(stopwatch, now);
  const lastSplit = stopwatch.splits[stopwatch.splits.length - 1] ?? 0;
  const rows = lapRows(stopwatch.splits);
  const running = stopwatch.status === "running";

  return (
    <div className={`clock-stage stopwatch-face${rows.length ? " has-laps" : ""}`}>
      <div className="stopwatch-readout">
        <div className="clock-digits clock-digits--stopwatch num" role="timer" aria-label="Waktu berjalan">
          {formatDuration(elapsed, { centis: true })}
        </div>
        <p className="clock-note num">
          {stopwatch.status === "idle"
            ? "Tekan Mulai atau Spasi"
            : `Putaran ${stopwatch.splits.length + 1} · ${formatDuration(elapsed - lastSplit, { centis: true })}`}
        </p>
      </div>

      <div className="clock-controls">
        <button
          type="button"
          className="btn clock-btn"
          onClick={() => clockStore.stopwatch({ type: "reset" })}
          disabled={stopwatch.status === "idle"}
        >
          <RotateCcw size={16} strokeWidth={1.5} aria-hidden="true" />
          Reset
        </button>
        <button
          type="button"
          className="btn btn--primary clock-btn clock-btn--main"
          onClick={() => clockStore.stopwatch({ type: running ? "pause" : "start" })}
        >
          {running ? <Pause size={18} strokeWidth={2} aria-hidden="true" /> : <Play size={18} strokeWidth={2} aria-hidden="true" />}
          {running ? "Jeda" : stopwatch.status === "paused" ? "Lanjutkan" : "Mulai"}
        </button>
        <button type="button" className="btn clock-btn" onClick={() => clockStore.stopwatch({ type: "lap" })} disabled={!running}>
          <Flag size={16} strokeWidth={1.5} aria-hidden="true" />
          Putaran
        </button>
      </div>

      {rows.length > 0 && (
        <table className="laps num">
          <caption className="visually-hidden">Daftar putaran</caption>
          <thead>
            <tr>
              <th scope="col">Putaran</th>
              <th scope="col" className="laps__num">
                Waktu putaran
              </th>
              <th scope="col" className="laps__num">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.number}>
                <td>
                  {row.number}
                  {row.mark && (
                    <span className={`pill laps__pill laps__pill--${row.mark}`}>{row.mark === "fastest" ? "Tercepat" : "Terlama"}</span>
                  )}
                </td>
                <td className="laps__num">{formatDuration(row.lap, { centis: true })}</td>
                <td className="laps__num laps__total">{formatDuration(row.total, { centis: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
