/** Pratinjau di home: dua foto (JPEG dan PNG berlatar transparan) menjadi tumpukan halaman PDF. */
export function ImageToPdfPreview() {
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="22" y="38" width="46" height="36" fill="#1b6c80" />
      <path d="M26 70l12-14 8 9 6-6 12 11z" fill="#fff" opacity="0.85" />
      <rect x="40" y="84" width="40" height="40" fill="#fff" />
      {[0, 1, 2, 3].flatMap((x) => [0, 1, 2, 3].filter((y) => (x + y) % 2 === 0).map((y) => <rect key={`${x}${y}`} x={40 + x * 10} y={84 + y * 10} width="10" height="10" fill="#e3e4e0" />))}
      <circle cx="60" cy="104" r="12" fill="#aeb3ad" />
      <path d="M100 78h22m-6-6 6 6-6 6" fill="none" stroke="#5d5f60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="160" y="26" width="64" height="90" fill="#d8dad5" />
      <rect x="150" y="34" width="64" height="90" fill="#fff" />
      <rect x="158" y="44" width="48" height="36" fill="#1b6c80" />
      <rect x="158" y="86" width="48" height="4" rx="2" fill="#bfc3bd" />
      <rect x="158" y="94" width="34" height="4" rx="2" fill="#bfc3bd" />
      <rect x="158" y="106" width="22" height="11" rx="2" fill="#131416" />
    </svg>
  );
}
