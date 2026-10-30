import { Bone, SkeletonPage } from "../../components/Skeleton";
import "../timer/timer.css";
import "./pomodoro.css";

/** Skeleton: bar, panel durasi/pergantian fase, tab fase, cincin, titik sesi, dan tombol. */
export function PomodoroSkeleton() {
  return (
    <SkeletonPage label="Memuat Pomodoro">
      <div className="tool">
        <header className="tool-bar">
          <Bone w={32} h={32} r={6} />
          <h1>Pomodoro</h1>
          <span className="tool-bar__status" />
        </header>
        <div className="tool-body tool-body--sidebar">
          <aside className="panel">
            {["Durasi", "Pergantian fase", "Sesi ini"].map((title, i) => (
              <section key={title} className="panel__section">
                <header className="panel__head">
                  <h2>{title}</h2>
                </header>
                <Bone h={i === 0 ? 120 : 64} r={8} />
              </section>
            ))}
          </aside>
          <main className="panel workspace clock">
            <div className="clock-tabs">
              <span className="clock-tab is-active">Fokus</span>
              <span className="clock-tab">Istirahat pendek</span>
              <span className="clock-tab">Istirahat panjang</span>
            </div>
            <div className="clock-panel">
              <div className="clock-stage">
                <div className="timer-ring">
                  <Bone w="100%" h="100%" r={999} style={{ position: "absolute", inset: 0, opacity: 0.6 }} />
                </div>
                <div className="pomodoro-dots">
                  {Array.from({ length: 4 }, (_, i) => (
                    <span key={i} className="pomodoro-dot" />
                  ))}
                </div>
                <div className="clock-controls">
                  <Bone w={96} h={44} r={999} />
                  <Bone w={168} h={44} r={999} />
                  <Bone w={104} h={44} r={999} />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SkeletonPage>
  );
}
