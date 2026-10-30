/** Pratinjau di home: halaman PDF berubah jadi tumpukan foto JPEG. */
export function PdfToJpgPreview() {
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d="M44 22h44l16 16v95H44z" fill="#fff" />
      <path d="M88 22v16h16" fill="#d8dad5" />
      {[52, 60, 68, 76, 84, 92, 100].map((y, i) => (
        <rect key={y} x="54" y={y} width={i % 3 === 2 ? 26 : 40} height="3" rx="1.5" fill="#bfc3bd" />
      ))}
      <rect x="54" y="110" width="22" height="12" rx="2" fill="#131416" />
      <path d="M118 78h22m-6-6 6 6-6 6" fill="none" stroke="#5d5f60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="166" y="34" width="50" height="66" fill="#c9ccc6" />
      <rect x="160" y="42" width="50" height="66" fill="#aeb3ad" />
      <rect x="154" y="50" width="50" height="66" fill="#1b6c80" />
      <path d="M160 108l12-16 9 11 6-7 11 12z" fill="#fff" opacity="0.85" />
    </svg>
  );
}
