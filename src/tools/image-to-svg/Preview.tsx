/** Pratinjau di home: bentuk berpiksel (tangga di tepi) menjadi bentuk vektor mulus dengan titik kurva. */
export function ImageToSvgPreview() {
  const pixels = Array.from({ length: 64 }, (_, i) => ({ x: i % 8, y: Math.floor(i / 8) })).filter(({ x, y }) => (x - 3.5) ** 2 + (y - 3.5) ** 2 <= 13);
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="26" y="40" width="72" height="72" fill="#fff" />
      {pixels.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={30 + x * 8} y={44 + y * 8} width="8" height="8" fill="#1b6c80" />
      ))}
      <path d="M114 78h22m-6-6 6 6-6 6" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="150" y="40" width="72" height="72" fill="#fff" />
      <circle cx="186" cy="76" r="26" fill="#1b6c80" />
      <circle cx="186" cy="76" r="26" fill="none" stroke="var(--text)" strokeWidth="1" strokeDasharray="3 3" />
      {[
        [160, 76],
        [212, 76],
        [186, 50],
        [186, 102],
      ].map(([cx, cy]) => (
        <rect key={`${cx}-${cy}`} x={cx - 3} y={cy - 3} width="6" height="6" fill="var(--surface)" stroke="var(--text)" strokeWidth="1" />
      ))}
    </svg>
  );
}
