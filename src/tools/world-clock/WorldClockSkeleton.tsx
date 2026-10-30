import { Bone, SkeletonPage } from "../../components/Skeleton";
import "./world-clock.css";

/** Skeleton: bar, panel (cari kota, tampilan, geser waktu), lalu tiga kartu jam berdampingan. */
export function WorldClockSkeleton() {
  return (
    <SkeletonPage label="Memuat Jam Dunia">
      <div className="tool">
        <header className="tool-bar">
          <Bone w={32} h={32} r={6} />
          <h1>Jam Dunia</h1>
          <span className="tool-bar__status" />
        </header>
        <div className="tool-body tool-body--sidebar">
          <aside className="panel">
            {[
              { title: "Tambah kota", h: 112 },
              { title: "Tampilan", h: 128 },
              { title: "Geser waktu", h: 64 },
            ].map(({ title, h }) => (
              <section key={title} className="panel__section">
                <header className="panel__head">
                  <h2>{title}</h2>
                </header>
                <Bone h={h} r={8} />
              </section>
            ))}
          </aside>
          <main className="panel workspace">
            <div className="workspace__head">
              <div>
                <h2>Sekarang</h2>
                <Bone w={180} h={14} style={{ marginTop: 4 }} />
              </div>
            </div>
            <div className="world-grid">
              {[0, 1, 2].map((i) => (
                <div key={i} className="world-card">
                  <div className="world-card__head">
                    <Bone w={96} h={20} />
                    <Bone w={140} h={14} style={{ marginTop: 6 }} />
                  </div>
                  <span className="world-card__time">
                    <Bone w="62%" h="1em" r={8} />
                  </span>
                  <Bone w={150} h={16} />
                  <div className="world-card__foot">
                    <Bone w={140} h={14} />
                    <Bone w={96} h={32} r={6} />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </SkeletonPage>
  );
}
