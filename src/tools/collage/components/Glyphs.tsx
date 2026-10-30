/** Gambar mini grid R×K: dipakai di tombol preset dan pratinjau home. */
export function GridGlyph({ rows, cols, size = 32 }: { rows: number; cols: number; size?: number }) {
  const gap = 2;
  const cw = (size - gap * (cols - 1)) / cols;
  const ch = (size - gap * (rows - 1)) / rows;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {Array.from({ length: rows * cols }, (_, i) => (
        <rect
          key={i}
          x={(i % cols) * (cw + gap)}
          y={Math.floor(i / cols) * (ch + gap)}
          width={cw}
          height={ch}
          rx={1}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

/** Persegi panjang seukuran rasio, dimuat dalam kotak `box`×`box`. */
export function RatioGlyph({ w, h, box = 24 }: { w: number; h: number; box?: number }) {
  const scale = box / Math.max(w, h);
  const rw = Math.max(4, w * scale);
  const rh = Math.max(4, h * scale);
  return (
    <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} aria-hidden="true">
      <rect
        x={(box - rw) / 2 + 0.75}
        y={(box - rh) / 2 + 0.75}
        width={rw - 1.5}
        height={rh - 1.5}
        rx={2}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </svg>
  );
}
