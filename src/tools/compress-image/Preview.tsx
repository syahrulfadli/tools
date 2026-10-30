/** Pratinjau di home: gambar besar (tumpukan batang ukuran) menyusut jadi gambar kecil. */
export function CompressImagePreview() {
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="26" y="30" width="86" height="86" fill="#d8dad5" />
      <rect x="26" y="30" width="86" height="86" fill="#1b6c80" />
      <path d="M32 108l26-30 18 20 12-12 18 22z" fill="#fff" opacity="0.85" />
      <circle cx="90" cy="52" r="8" fill="#fff" opacity="0.85" />
      <path d="M122 73h22m-6-6 6 6-6 6" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="156" y="62" width="48" height="48" fill="#1b6c80" />
      <path d="M160 104l16-18 11 12 8-8 9 14z" fill="#fff" opacity="0.85" />
      <circle cx="194" cy="76" r="5" fill="#fff" opacity="0.85" />
      <rect x="156" y="118" width="26" height="5" rx="2.5" fill="#bfc3bd" />
    </svg>
  );
}
