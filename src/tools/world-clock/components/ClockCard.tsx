import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Place } from "../lib/places";
import {
  dayDiff,
  dayRelation,
  formatClock,
  formatDate,
  formatDiff,
  formatUtcOffset,
  isNight,
  offsetMinutes,
  partOfDay,
  zoneAbbreviation,
  zoneTime,
  type ZoneTime,
} from "../lib/zone";
import type { Face } from "../lib/persist";
import { AnalogFace } from "./AnalogFace";

/** Satu jam kota: nama, angka besar (atau muka analog), tanggal, dan selisih dari waktu lokal. */
export function ClockCard({
  place,
  at,
  local,
  isLocal,
  face,
  hour12,
  seconds,
  first,
  last,
  onMove,
  onRemove,
}: {
  place: Place;
  at: number;
  /** Jam dan selisih UTC zona perangkat pada saat `at`, pembanding semua kartu. */
  local: { time: ZoneTime; offset: number };
  isLocal: boolean;
  face: Face;
  hour12: boolean;
  seconds: boolean;
  first: boolean;
  last: boolean;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const time = zoneTime(place.zone, at);
  const offset = offsetMinutes(place.zone, at);
  const diff = offset - local.offset;
  const days = dayDiff(time, local.time);
  const clock = formatClock(time, hour12);
  const abbreviation = zoneAbbreviation(place.zone, at);

  return (
    <article className={`world-card world-card--${face}${isNight(time.hour) ? " is-night" : ""}`} aria-label={place.name}>
      <header className="world-card__head">
        <h3>
          {place.name}
          {isLocal && <span className="pill">Lokal</span>}
        </h3>
        <p>{[place.country, abbreviation, formatUtcOffset(offset)].filter(Boolean).join(" · ")}</p>
      </header>

      {face === "analog" && <AnalogFace time={time} seconds={seconds} />}

      <time className="world-card__time num" dateTime={new Date(at).toISOString()}>
        <span className="world-card__main">{clock.main}</span>
        {(seconds || clock.period) && (
          <span className="world-card__aside">
            {seconds && <span>{clock.seconds}</span>}
            {clock.period && <span>{clock.period}</span>}
          </span>
        )}
      </time>

      <p className="world-card__date">
        {formatDate(time)}
        {days !== 0 && ` (${dayRelation(days)})`} · {partOfDay(time.hour)}
      </p>

      <footer className="world-card__foot">
        <p className="num">{diff === 0 ? "Sama dengan waktu lokal" : `${formatDiff(diff)} dari waktu lokal`}</p>
        <div className="world-card__actions">
          <button type="button" className="btn btn--ghost btn--icon" disabled={first} aria-label={`Pindahkan ${place.name} ke depan`} onClick={() => onMove(-1)}>
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <button type="button" className="btn btn--ghost btn--icon" disabled={last} aria-label={`Pindahkan ${place.name} ke belakang`} onClick={() => onMove(1)}>
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
          <button type="button" className="btn btn--ghost btn--icon" aria-label={`Hapus ${place.name}`} onClick={onRemove}>
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      </footer>
    </article>
  );
}
