/** Pratinjau di home: baris link berubah jadi QR code. Pola tetap (bukan QR asli) agar ringan. */
const CELLS = [
  "1111111010111",
  "1000001001001",
  "1011101011101",
  "1011101000101",
  "1011101011001",
  "1000001010111",
  "1111111010101",
  "0000000011000",
  "1101011100111",
  "0110100101010",
  "1011011011101",
  "0100110010011",
  "1110101101101",
];

export function QrCodePreview() {
  const cell = 7;
  const x0 = 146;
  const y0 = 32;
  return (
    <svg viewBox="0 0 248 155" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="22" y="66" width="80" height="22" rx="4" fill="var(--surface)" stroke="var(--border)" />
      <rect x="30" y="75" width="52" height="4" rx="2" fill="var(--accent)" />
      <path d="M110 77h18m-6-6 6 6-6 6" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x={x0 - 8} y={y0 - 8} width={CELLS.length * cell + 16} height={CELLS.length * cell + 16} fill="#fff" />
      {CELLS.flatMap((row, y) =>
        [...row].map((on, x) => (on === "1" ? <rect key={`${x}-${y}`} x={x0 + x * cell} y={y0 + y * cell} width={cell} height={cell} fill="#131416" /> : null)),
      )}
    </svg>
  );
}
