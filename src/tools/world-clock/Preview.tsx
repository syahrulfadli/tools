/** Pratinjau di home: dua jam analog berdampingan dengan nama kota dan jamnya. */
export function WorldClockPreview() {
  const clocks = [
    { cx: 72, name: "Jakarta", time: "10:10", hour: 305, minute: 60 },
    { cx: 176, name: "London", time: "04:10", hour: 125, minute: 60 },
  ];
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {clocks.map((clock, i) => (
        <g key={clock.name}>
          <circle cx={clock.cx} cy="62" r="40" fill="var(--surface)" stroke="var(--border)" strokeWidth="3" />
          {[0, 90, 180, 270].map((angle) => (
            <line key={angle} x1={clock.cx} y1="27" x2={clock.cx} y2="33" stroke="var(--muted)" strokeWidth="2.5" transform={`rotate(${angle} ${clock.cx} 62)`} />
          ))}
          <line x1={clock.cx} y1="62" x2={clock.cx} y2="40" stroke="var(--text)" strokeWidth="4" strokeLinecap="round" transform={`rotate(${clock.hour} ${clock.cx} 62)`} />
          <line x1={clock.cx} y1="62" x2={clock.cx} y2="32" stroke="var(--text)" strokeWidth="3" strokeLinecap="round" transform={`rotate(${clock.minute} ${clock.cx} 62)`} />
          {i === 0 && <line x1={clock.cx} y1="68" x2={clock.cx} y2="30" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(200 ${clock.cx} 62)`} />}
          <circle cx={clock.cx} cy="62" r="3" fill="var(--accent)" />
          <text x={clock.cx} y="128" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--text)">
            {clock.name}
          </text>
          <text x={clock.cx} y="145" textAnchor="middle" fontSize="12" fill="var(--muted)" style={{ fontVariantNumeric: "tabular-nums" }}>
            {clock.time}
          </text>
        </g>
      ))}
    </svg>
  );
}
