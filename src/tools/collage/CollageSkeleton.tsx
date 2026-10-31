import type { ReactNode } from "react";
import { Bone, SkeletonPage } from "../../components/Skeleton";
import "./collage.css";

/**
 * Tampil selama chunk tool kolase dimuat. Meniru layout akhir (bar atas, dua panel,
 * kanvas) dengan ukuran yang sama supaya tidak ada lompatan saat tool siap.
 */
export function CollageSkeleton() {
  return (
    <SkeletonPage label="Memuat Kolase Foto">
      <div className="tool">
        <header className="tool-bar">
          <Bone w={32} h={32} r={6} />
          <h1>Kolase Foto</h1>
          <Bone w={124} h={20} r={999} />
          <span className="tool-bar__status" />
          <div className="tool-bar__actions">
            <Bone w={112} h={32} r={6} />
            <Bone w={120} h={32} r={6} />
            <Bone w={116} h={32} r={6} />
          </div>
        </header>
        <div className="tool-body collage__body">
          <aside className="panel settings">
            <SkeletonSection title="Grid">
              <div className="preset-grid">
                {Array.from({ length: 9 }, (_, i) => (
                  <Bone key={i} h={64} r={8} />
                ))}
              </div>
            </SkeletonSection>
            <SkeletonSection title="Rasio">
              <div className="ratio-list">
                {Array.from({ length: 8 }, (_, i) => (
                  <Bone key={i} h={48} r={8} />
                ))}
              </div>
            </SkeletonSection>
          </aside>
          <div className="canvas-well">
            <div className="skeleton-sheet">
              {Array.from({ length: 4 }, (_, i) => (
                <Bone key={i} h="100%" r={0} />
              ))}
            </div>
          </div>
          <aside className="panel photos">
            <SkeletonSection title="Foto">
              <Bone h={112} r={10} />
            </SkeletonSection>
            <SkeletonSection title="Sel terpilih">
              <Bone w="90%" h={14} />
              <Bone w="60%" h={14} style={{ marginTop: 8 }} />
            </SkeletonSection>
          </aside>
        </div>
      </div>
    </SkeletonPage>
  );
}

function SkeletonSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel__section">
      <header className="panel__head">
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}
