/** Format dan pecah durasi dalam milidetik. Fungsi murni. */

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
/** Batas timer: 99 jam 59 menit 59 detik (dua digit per kolom). */
export const MAX_TIMER = 99 * HOUR + 59 * MINUTE + 59 * SECOND;

export function toMs(hours: number, minutes: number, seconds: number) {
  return Math.min(MAX_TIMER, Math.max(0, hours * HOUR + minutes * MINUTE + seconds * SECOND));
}

export function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms));
  return {
    hours: Math.floor(total / HOUR),
    minutes: Math.floor((total % HOUR) / MINUTE),
    seconds: Math.floor((total % MINUTE) / SECOND),
    centis: Math.floor((total % SECOND) / 10),
  };
}

const two = (n: number) => String(n).padStart(2, "0"); // taste-skill-ignore: digit jam

/**
 * "05:09", "1:05:09", atau dengan seperseratus detik "05:09.42".
 * Jam hanya ditulis bila ada (atau dipaksa), agar angka tidak melebar tanpa perlu.
 */
export function formatDuration(ms: number, { centis = false, forceHours = false } = {}) {
  const p = splitDuration(ms);
  const base = p.hours > 0 || forceHours ? `${p.hours}:${two(p.minutes)}:${two(p.seconds)}` : `${two(p.minutes)}:${two(p.seconds)}`;
  return centis ? `${base}.${two(p.centis)}` : base;
}

/** Sisa waktu timer dibulatkan ke atas ke detik penuh: 4,2 detik tersisa tampil "00:05". */
export function ceilToSecond(ms: number) {
  return Math.ceil(Math.max(0, ms) / SECOND) * SECOND;
}

/** Durasi dalam kata untuk pembaca layar dan judul: "1 jam 5 menit", "45 detik". */
export function durationInWords(ms: number) {
  const { hours, minutes, seconds } = splitDuration(ms);
  const parts = [hours && `${hours} jam`, minutes && `${minutes} menit`, seconds && `${seconds} detik`].filter(Boolean);
  return parts.length ? parts.join(" ") : "0 detik";
}
