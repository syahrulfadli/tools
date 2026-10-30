import { Bone, SkeletonPage } from "../../components/Skeleton";
import "./timer.css";

/** Skeleton: bar, panel preset/alarm, tab mode, cincin dan tombol di tengah. */
export function TimerSkeleton() {
  return (
    <SkeletonPage label="Memuat Timer & Stopwatch">
      <div className="tool">
        <header className="tool-bar">
          <Bone w={32} h={32} r={6} />
          <h1>Timer &amp; Stopwatch</h1>
          <span className="tool-bar__status" />
        </header>
        <div className="tool-body tool-body--sidebar">
          <aside className="panel">
            {["Preset", "Alarm", "Pintasan keyboard"].map((title, i) => (
              <section key={title} className="panel__section">
                <header className="panel__head">
                  <h2>{title}</h2>
                </header>
                <Bone h={i === 0 ? 72 : 40} r={8} />
              </section>
            ))}
          </aside>
          <main className="panel workspace clock">
            <div className="clock-tabs">
              <span className="clock-tab is-active">Timer</span>
              <span className="clock-tab">Stopwatch</span>
            </div>
            <div className="clock-panel">
              <div className="clock-stage">
                <div className="timer-ring">
                  <Bone w="100%" h="100%" r={999} style={{ position: "absolute", inset: 0, opacity: 0.6 }} />
                </div>
                <div className="clock-controls">
                  <Bone w={96} h={44} r={999} />
                  <Bone w={168} h={44} r={999} />
                  <Bone w={108} h={44} r={999} />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SkeletonPage>
  );
}
