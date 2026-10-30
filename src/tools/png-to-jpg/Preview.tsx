/** Pratinjau di home: gambar berlatar transparan (papan catur) jadi JPEG berlatar putih. */
export function PngToJpgPreview() {
  const checker = Array.from({ length: 36 }, (_, i) => ({ x: i % 6, y: Math.floor(i / 6) })).filter(({ x, y }) => (x + y) % 2 === 0);
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="34" y="40" width="72" height="72" fill="#fff" />
      {checker.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={34 + x * 12} y={40 + y * 12} width="12" height="12" fill="#e3e4e0" />
      ))}
      <circle cx="70" cy="76" r="22" fill="#1b6c80" />
      <path d="M118 78h22m-6-6 6 6-6 6" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="152" y="40" width="72" height="72" fill="#fff" />
      <circle cx="188" cy="76" r="22" fill="#1b6c80" />
    </svg>
  );
}
