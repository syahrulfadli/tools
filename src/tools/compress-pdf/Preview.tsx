/** Pratinjau di home: halaman PDF besar menyusut jadi halaman kecil. */
export function CompressPdfPreview() {
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d="M30 20h56l18 18v100H30z" fill="#fff" />
      <path d="M86 20v18h18" fill="#d8dad5" />
      <rect x="40" y="50" width="54" height="34" fill="#1b6c80" />
      {[94, 102, 110].map((y, i) => (
        <rect key={y} x="40" y={y} width={i === 2 ? 28 : 54} height="3" rx="1.5" fill="#bfc3bd" />
      ))}
      <rect x="40" y="120" width="24" height="12" rx="2" fill="#131416" />
      <path d="M120 78h22m-6-6 6 6-6 6" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M160 52h38l12 12v60h-50z" fill="#fff" />
      <path d="M198 52v12h12" fill="#d8dad5" />
      <rect x="167" y="72" width="36" height="22" fill="#1b6c80" />
      {[100, 106].map((y, i) => (
        <rect key={y} x="167" y={y} width={i === 1 ? 20 : 36} height="3" rx="1.5" fill="#bfc3bd" />
      ))}
      <rect x="167" y="112" width="18" height="9" rx="2" fill="#131416" />
    </svg>
  );
}
