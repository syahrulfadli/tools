import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, Globe, RotateCcw } from "lucide-react";
import { ToolBar } from "../../components/tool/ToolBar";
import { PanelSection, Segmented, Slider, Toggle } from "../../components/tool/controls";
import { CitySearch } from "./components/CitySearch";
import { ClockCard } from "./components/ClockCard";
import { useSecondTick } from "./lib/hooks";
import { MAX_PLACES, loadState, saveState, type Face, type WorldClockState } from "./lib/persist";
import { isSortedByOffset, movePlace, placeForZone, sortByOffset, type Place } from "./lib/places";
import { MINUTE, formatDiff, formatUtcOffset, localZone, offsetMinutes, sameZone, zoneAbbreviation, zoneTime } from "./lib/zone";
import "./world-clock.css";

/** Geser waktu: maju/mundur sampai 24 jam, per 15 menit (zona seperti Nepal +5:45 tetap bisa pas). */
const SHIFT_LIMIT = 24 * 60;

export default function WorldClockTool() {
  const local = useMemo(localZone, []);
  const [state, setState] = useState<WorldClockState>(() => loadState(local));
  const [shift, setShift] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const now = useSecondTick();
  const at = now + shift * MINUTE;

  useEffect(() => saveState(state, local), [state, local]);

  const { places, face, hour12, seconds } = state;
  const update = (patch: Partial<WorldClockState>) => setState((current) => ({ ...current, ...patch }));
  const setPlaces = (change: (places: Place[]) => Place[]) => setState((current) => ({ ...current, places: change(current.places) }));

  const localInfo = { time: zoneTime(local, at), offset: offsetMinutes(local, at) };
  const localLabel = zoneAbbreviation(local, at) || placeForZone(local).name;
  const added = new Set(places.map((place) => place.id));
  const full = places.length >= MAX_PLACES;

  function addPlace(place: Place) {
    setPlaces((list) => (list.length >= MAX_PLACES || list.some((item) => item.id === place.id) ? list : [...list, place]));
  }

  return (
    <div className="tool">
      <title>Jam Dunia · Productivity Tools</title>

      <ToolBar title="Jam Dunia" pill={shift !== 0 ? `Pratinjau ${formatDiff(shift)}` : undefined} />

      <div className="tool-body tool-body--sidebar">
        <aside className="panel" aria-label="Pengaturan">
          <PanelSection title="Tambah kota" aside={`${places.length} dari ${MAX_PLACES}`}>
            <CitySearch inputRef={searchRef} added={added} full={full} at={at} hour12={hour12} local={local} onAdd={addPlace} />
          </PanelSection>

          <PanelSection title="Tampilan">
            <Segmented<Face>
              label="Jam"
              value={face}
              options={[
                { value: "digital", label: "Digital" },
                { value: "analog", label: "Analog" },
              ]}
              onChange={(next) => update({ face: next })}
            />
            <Segmented<"24" | "12">
              label="Format"
              value={hour12 ? "12" : "24"}
              options={[
                { value: "24", label: "24 jam" },
                { value: "12", label: "12 jam (AM/PM)" },
              ]}
              onChange={(next) => update({ hour12: next === "12" })}
            />
            <div className="world-toggle">
              <Toggle label="Tampilkan detik" checked={seconds} onChange={(next) => update({ seconds: next })} />
            </div>
          </PanelSection>

          <PanelSection title="Geser waktu">
            <Slider
              label="Maju atau mundur"
              value={shift}
              min={-SHIFT_LIMIT}
              max={SHIFT_LIMIT}
              step={15}
              display={shift === 0 ? "Sekarang" : formatDiff(shift)}
              onChange={setShift}
            />
            <p className="field-note">Semua jam ikut bergeser. Pakai untuk mencari jam rapat yang pas di setiap kota.</p>
          </PanelSection>
        </aside>

        <main className="panel workspace">
          <div className="workspace__head">
            <div>
              <h2>{shift === 0 ? "Sekarang" : `${formatDiff(shift)} dari sekarang`}</h2>
              <p className="num">
                Waktu lokal: {localLabel} · {formatUtcOffset(localInfo.offset)}
              </p>
            </div>
            <div className="workspace__tools">
              {shift !== 0 && (
                <button type="button" className="btn" onClick={() => setShift(0)}>
                  <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
                  Kembali ke sekarang
                </button>
              )}
              {places.length > 1 && (
                <button type="button" className="btn" disabled={isSortedByOffset(places, at)} onClick={() => setPlaces((list) => sortByOffset(list, at))}>
                  <ArrowDownUp size={14} strokeWidth={1.5} aria-hidden="true" />
                  Urutkan barat ke timur
                </button>
              )}
            </div>
          </div>

          {places.length === 0 ? (
            <button type="button" className="workspace__empty" onClick={() => searchRef.current?.focus()}>
              <Globe size={28} strokeWidth={1.5} aria-hidden="true" />
              <strong>Belum ada jam</strong>
              <span>Cari kota di panel Tambah kota. Tambahkan dua atau lebih untuk membandingkan jamnya berdampingan.</span>
            </button>
          ) : (
            <div className="world-grid">
              {places.map((place, index) => (
                <ClockCard
                  key={place.id}
                  place={place}
                  at={at}
                  local={localInfo}
                  isLocal={sameZone(place.zone, local)}
                  face={face}
                  hour12={hour12}
                  seconds={seconds}
                  first={index === 0}
                  last={index === places.length - 1}
                  onMove={(direction) => setPlaces((list) => movePlace(list, index, direction))}
                  onRemove={() => setPlaces((list) => list.filter((item) => item.id !== place.id))}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
