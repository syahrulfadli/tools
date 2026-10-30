/** Pratinjau di home: halaman dengan goresan tanda tangan di atas garis. */
export function SignPdfPreview() {
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="72" y="14" width="104" height="128" fill="#fff" />
      {[30, 38, 46, 54, 62].map((y, i) => (
        <rect key={y} x="84" y={y} width={i % 2 ? 60 : 80} height="3" rx="1.5" fill="#bfc3bd" />
      ))}
      <rect x="116" y="88" width="50" height="34" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="0" />
      <path d="M122 112c4-14 8-18 10-12s-4 14 0 10 6-14 10-10 2 10 6 6 6-6 12-4" fill="none" stroke="#1d3f9a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="120" y="116" width="42" height="1.5" fill="#bfc3bd" />
      <rect x="161" y="117" width="8" height="8" rx="2" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  );
}
