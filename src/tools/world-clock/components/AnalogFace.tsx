import type { ZoneTime } from "../lib/zone";

const TICKS = Array.from({ length: 60 }, (_, i) => i);

/** Muka jam analog. Jarum melompat per detik (tanpa animasi) agar 59 → 0 tidak berputar mundur. */
export function AnalogFace({ time, seconds }: { time: ZoneTime; seconds: boolean }) {
  const hour = ((time.hour % 12) + time.minute / 60) * 30;
  const minute = (time.minute + time.second / 60) * 6;
  const second = time.second * 6;
  return (
    <svg className="world-face" viewBox="0 0 200 200" aria-hidden="true">
      <circle className="world-face__dial" cx="100" cy="100" r="96" />
      {TICKS.map((i) => {
        const major = i % 5 === 0;
        return (
          <line
            key={i}
            className={major ? "world-face__tick world-face__tick--hour" : "world-face__tick"}
            x1="100"
            y1="10"
            x2="100"
            y2={major ? 24 : 15}
            transform={`rotate(${i * 6} 100 100)`}
          />
        );
      })}
      <line className="world-face__hour" x1="100" y1="114" x2="100" y2="54" transform={`rotate(${hour} 100 100)`} />
      <line className="world-face__minute" x1="100" y1="116" x2="100" y2="30" transform={`rotate(${minute} 100 100)`} />
      {seconds && <line className="world-face__second" x1="100" y1="122" x2="100" y2="22" transform={`rotate(${second} 100 100)`} />}
      <circle className="world-face__pin" cx="100" cy="100" r="4.5" />
    </svg>
  );
}
