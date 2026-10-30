/**
 * Daftar kota dan setelan tampilan disimpan di localStorage browser ini agar jam yang sama
 * muncul lagi saat tool dibuka. Ini preferensi, bukan data user: tidak ada yang dikirim ke server.
 */
import { readJson, removeKey, writeJson } from "../../../lib/storage";
import { defaultPlaces, type Place } from "./places";
import { isValidZone } from "./zone";

/** Naikkan versinya bila arti sebuah kolom berubah; versi lama lalu diabaikan. */
export const STORAGE_KEY = "jam-dunia:v1";
export const MAX_PLACES = 12;

export type Face = "digital" | "analog";

export interface WorldClockState {
  places: Place[];
  face: Face;
  hour12: boolean;
  seconds: boolean;
}

export function defaultState(local: string): WorldClockState {
  return { places: defaultPlaces(local), face: "digital", hour12: false, seconds: true };
}

const text = (value: unknown, max = 80) => typeof value === "string" && value.trim() !== "" && value.length <= max;

/**
 * Ambil state dari nilai apa pun (JSON rusak, kuno, diedit tangan). Kota dengan zona yang
 * tidak dikenal browser ini dibuang, duplikat digabung, jumlahnya dibatasi. Daftar kosong
 * tetap kosong: itu pilihan user, bukan data rusak.
 */
export function sanitizeState(raw: unknown, local: string): WorldClockState {
  const d = defaultState(local);
  if (!raw || typeof raw !== "object") return d;
  const s = raw as Record<string, unknown>;

  let places = d.places;
  if (Array.isArray(s.places)) {
    const seen = new Set<string>();
    places = [];
    for (const item of s.places) {
      if (!item || typeof item !== "object") continue;
      const { id, name, country, zone } = item as Record<string, unknown>;
      if (!text(id) || !text(name) || !text(country) || !text(zone) || seen.has(id as string)) continue;
      if (!isValidZone(zone as string)) continue;
      seen.add(id as string);
      places.push({ id, name, country, zone } as Place);
      if (places.length === MAX_PLACES) break;
    }
  }

  return {
    places,
    face: s.face === "analog" ? "analog" : "digital",
    hour12: typeof s.hour12 === "boolean" ? s.hour12 : d.hour12,
    seconds: typeof s.seconds === "boolean" ? s.seconds : d.seconds,
  };
}

export function isDefaultState(state: WorldClockState, local: string) {
  const d = defaultState(local);
  return (
    state.face === d.face &&
    state.hour12 === d.hour12 &&
    state.seconds === d.seconds &&
    state.places.length === d.places.length &&
    state.places.every((place, i) => place.id === d.places[i].id)
  );
}

export function loadState(local: string): WorldClockState {
  return sanitizeState(readJson(STORAGE_KEY), local);
}

/** State bawaan tidak disimpan: kunci dihapus agar penyimpanan tetap bersih. */
export function saveState(state: WorldClockState, local: string) {
  if (isDefaultState(state, local)) removeKey(STORAGE_KEY);
  else writeJson(STORAGE_KEY, state);
}
