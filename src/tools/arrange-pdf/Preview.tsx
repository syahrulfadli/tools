/** Pratinjau di home: deretan halaman, satu sedang dipindah, satu dicoret. */
export function ArrangePdfPreview() {
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="22" y="44" width="46" height="64" fill="#fff" />
      <rect x="29" y="54" width="32" height="20" fill="#1b6c80" />
      <rect x="29" y="80" width="30" height="3" rx="1.5" fill="#bfc3bd" />
      <rect x="29" y="87" width="20" height="3" rx="1.5" fill="#bfc3bd" />

      <rect x="90" y="30" width="46" height="64" fill="#fff" transform="rotate(-6 113 62)" />
      <rect x="97" y="42" width="30" height="3" rx="1.5" fill="#bfc3bd" transform="rotate(-6 113 62)" />
      <rect x="97" y="49" width="24" height="3" rx="1.5" fill="#bfc3bd" transform="rotate(-6 113 62)" />
      <rect x="97" y="56" width="30" height="3" rx="1.5" fill="#bfc3bd" transform="rotate(-6 113 62)" />
      <path d="M100 118h26m-6-6 6 6-6 6" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="158" y="44" width="46" height="64" fill="#fff" opacity="0.45" />
      <rect x="165" y="54" width="30" height="3" rx="1.5" fill="#bfc3bd" opacity="0.6" />
      <rect x="165" y="61" width="22" height="3" rx="1.5" fill="#bfc3bd" opacity="0.6" />
      <path d="M170 70l22 22m0-22-22 22" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
