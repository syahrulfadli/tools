/** Pratinjau di home: halaman Word (judul, paragraf) menjadi halaman PDF dengan teks yang sama. */
export function WordToPdfPreview() {
  const lines = [0, 1, 2, 3, 4, 5];
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d="M40 22h44l16 16v95H40z" fill="#fff" />
      <path d="M84 22v16h16" fill="#d8dad5" />
      <rect x="50" y="46" width="30" height="5" rx="2" fill="#1b6c80" />
      {lines.map((i) => (
        <rect key={i} x="50" y={60 + i * 8} width={i % 3 === 2 ? 26 : 40} height="3" rx="1.5" fill="#bfc3bd" />
      ))}
      <path d="M114 78h22m-6-6 6 6-6 6" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M150 22h44l16 16v95h-60z" fill="#fff" />
      <path d="M194 22v16h16" fill="#d8dad5" />
      <rect x="160" y="46" width="30" height="5" rx="2" fill="#1b6c80" />
      {lines.map((i) => (
        <rect key={i} x="160" y={60 + i * 8} width={i % 3 === 2 ? 26 : 40} height="3" rx="1.5" fill="#bfc3bd" />
      ))}
      <rect x="160" y="112" width="22" height="12" rx="2" fill="#131416" />
    </svg>
  );
}
