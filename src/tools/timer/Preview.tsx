/** Pratinjau di home: cincin timer yang tinggal sepertiga, dengan angka di tengahnya. */
export function TimerPreview() {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <circle cx="124" cy="78" r={r} fill="#fff" stroke="#e3e4e0" strokeWidth="4" />
      <circle
        cx="124"
        cy="78"
        r={r}
        fill="none"
        stroke="#1b6c80"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * 0.64}
        transform="rotate(-90 124 78)"
      />
      <text x="124" y="85" textAnchor="middle" fontSize="20" fontWeight="500" fill="#131416" style={{ fontVariantNumeric: "tabular-nums" }}>
        08:59
      </text>
    </svg>
  );
}
