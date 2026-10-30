/** Pratinjau di home: halaman PDF berubah jadi baris teks polos. */
export function PdfToTextPreview() {
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d="M40 22h44l16 16v95H40z" fill="#fff" />
      <path d="M84 22v16h16" fill="#d8dad5" />
      <rect x="50" y="48" width="36" height="22" fill="#1b6c80" />
      {[78, 86, 94, 102, 110].map((y, i) => (
        <rect key={y} x="50" y={y} width={i % 3 === 2 ? 26 : 40} height="3" rx="1.5" fill="#bfc3bd" />
      ))}
      <path d="M114 78h22m-6-6 6 6-6 6" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="150" y="34" width="64" height="88" rx="4" fill="var(--surface)" stroke="var(--border)" />
      {[46, 54, 62, 78, 86, 94, 102].map((y, i) => (
        <rect key={y} x="158" y={y} width={[44, 48, 30, 46, 40, 48, 22][i]} height="3" rx="1.5" fill="var(--text)" opacity="0.7" />
      ))}
    </svg>
  );
}
