/**
 * Pratinjau tool di home: tiga lembar kolase dengan tata letak dan rasio berbeda,
 * digambar dengan SVG agar tidak butuh aset gambar.
 */
const SHEETS = [
  { x: 14, y: 22, w: 64, h: 80, rows: 2, cols: 2 },
  { x: 90, y: 14, w: 56, h: 99, rows: 3, cols: 1 },
  { x: 158, y: 30, w: 76, h: 76, rows: 3, cols: 3 },
];
const TONES = ["#c9ccc6", "#aeb3ad", "#d8dad5", "#1b6c80", "#bfc3bd", "#9ea49d", "#d1d3ce", "#b7bbb5", "#c4c8c1"];

export function CollagePreview() {
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {SHEETS.map((sheet, s) => {
        const pad = 3;
        const gap = 3;
        const cw = (sheet.w - pad * 2 - gap * (sheet.cols - 1)) / sheet.cols;
        const ch = (sheet.h - pad * 2 - gap * (sheet.rows - 1)) / sheet.rows;
        return (
          <g key={s}>
            <rect x={sheet.x} y={sheet.y} width={sheet.w} height={sheet.h} rx={2} fill="#fff" />
            {Array.from({ length: sheet.rows * sheet.cols }, (_, i) => (
              <rect
                key={i}
                x={sheet.x + pad + (i % sheet.cols) * (cw + gap)}
                y={sheet.y + pad + Math.floor(i / sheet.cols) * (ch + gap)}
                width={cw}
                height={ch}
                fill={TONES[(i + s * 4) % TONES.length]}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
