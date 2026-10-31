/** Pratinjau di home: kode SVG berupa garis bentuk menjadi gambar piksel berisi warna. */
export function SvgToImagePreview() {
  const pixels = Array.from({ length: 64 }, (_, i) => ({ x: i % 8, y: Math.floor(i / 8) })).filter(({ x, y }) => (x - 3.5) ** 2 + (y - 3.5) ** 2 <= 13);
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="26" y="40" width="72" height="72" rx="4" fill="var(--surface)" stroke="var(--border)" />
      <circle cx="62" cy="76" r="22" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <circle cx="40" cy="76" r="3" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="84" cy="76" r="3" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="62" cy="54" r="3" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M114 78h22m-6-6 6 6-6 6" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="150" y="40" width="72" height="72" fill="#fff" />
      {pixels.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={154 + x * 8} y={44 + y * 8} width="8" height="8" fill="#1b6c80" />
      ))}
    </svg>
  );
}
