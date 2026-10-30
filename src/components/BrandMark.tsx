/** Tanda merek: empat petak, satu terisi aksen — kotak perkakas sekaligus grid kolase. */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="1" y="1" width="8" height="8" rx="1.5" fill="var(--text)" />
      <rect x="11" y="1" width="8" height="8" rx="1.5" fill="var(--text)" />
      <rect x="1" y="11" width="8" height="8" rx="1.5" fill="var(--text)" />
      <rect x="11" y="11" width="8" height="8" rx="1.5" fill="var(--accent)" />
    </svg>
  );
}
