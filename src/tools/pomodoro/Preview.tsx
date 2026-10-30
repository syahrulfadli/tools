/** Pratinjau di home: cincin fokus yang tinggal separuh, dengan titik sesi di bawahnya. */
export function PomodoroPreview() {
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <circle cx="124" cy="68" r={r} fill="var(--surface)" stroke="var(--border)" strokeWidth="4" />
      <circle
        cx="124"
        cy="68"
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * 0.48}
        transform="rotate(-90 124 68)"
      />
      <text x="124" y="60" textAnchor="middle" fontSize="9" fill="var(--muted)">
        Fokus
      </text>
      <text x="124" y="80" textAnchor="middle" fontSize="18" fontWeight="500" fill="var(--text)" style={{ fontVariantNumeric: "tabular-nums" }}>
        12:30
      </text>
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={106 + i * 12} cy="128" r="4" fill={i < 1 ? "var(--accent)" : "none"} stroke={i < 2 ? "var(--accent)" : "var(--control)"} strokeWidth="1.5" />
      ))}
    </svg>
  );
}
