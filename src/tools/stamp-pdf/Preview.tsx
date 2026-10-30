/** Pratinjau di home: halaman dengan watermark miring dan nomor di bawah. */
export function StampPdfPreview() {
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="140" y="26" width="72" height="102" fill="#d8dad5" />
      <rect x="36" y="18" width="80" height="114" fill="#fff" />
      {[32, 40, 48, 56, 64, 72, 80, 88].map((y, i) => (
        <rect key={y} x="46" y={y} width={i % 3 === 2 ? 38 : 60} height="3" rx="1.5" fill="#bfc3bd" />
      ))}
      <text x="76" y="80" textAnchor="middle" fontSize="15" fontWeight="700" fill="#c4242a" opacity="0.35" transform="rotate(-38 76 76)" fontFamily="Helvetica, Arial, sans-serif">
        RAHASIA
      </text>
      <text x="76" y="124" textAnchor="middle" fontSize="8" fill="#131416" fontFamily="Helvetica, Arial, sans-serif">
        1 / 2
      </text>
      <rect x="150" y="38" width="52" height="3" rx="1.5" fill="#bfc3bd" />
      <rect x="150" y="46" width="40" height="3" rx="1.5" fill="#bfc3bd" />
      <text x="176" y="120" textAnchor="middle" fontSize="7" fill="#5d5f60" fontFamily="Helvetica, Arial, sans-serif">
        2 / 2
      </text>
    </svg>
  );
}
