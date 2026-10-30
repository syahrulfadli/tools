import { Bone, SkeletonPage } from "../Skeleton";

/**
 * Skeleton untuk tool berpola "panel pengaturan + area kerja" (mis. converter).
 * Judul dan nama seksi tampil sebagai teks asli; nilai diganti balok abu.
 */
export function ConverterSkeleton({ title, sections }: { title: string; sections: string[] }) {
  return (
    <SkeletonPage label={`Memuat ${title}`}>
      <div className="tool">
        <header className="tool-bar">
          <Bone w={32} h={32} r={6} />
          <h1>{title}</h1>
          <span className="tool-bar__status" />
          <div className="tool-bar__actions">
            <Bone w={132} h={32} r={6} />
          </div>
        </header>
        <div className="tool-body tool-body--sidebar">
          <aside className="panel">
            {sections.map((section, i) => (
              <section key={section} className="panel__section">
                <header className="panel__head">
                  <h2>{section}</h2>
                </header>
                <Bone h={i === 0 ? 96 : 32} r={i === 0 ? 10 : 6} />
              </section>
            ))}
          </aside>
          <main className="panel workspace">
            <div className="workspace__skeleton">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="workspace__skeleton-row">
                  <Bone w={56} h={56} r={6} />
                  <span>
                    <Bone w="40%" h={14} />
                    <Bone w="24%" h={12} style={{ marginTop: 8 }} />
                  </span>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </SkeletonPage>
  );
}
