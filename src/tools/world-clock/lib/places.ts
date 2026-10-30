/**
 * Pencarian dan pengolahan kota. Data kota pilihan ada di `cities.ts`; zona IANA lain (±400,
 * dari Intl.supportedValuesOf) tetap bisa dicari lewat nama zonanya sebagai cadangan.
 */
import { CITIES } from "./cities";
import { COORDS } from "./coords";
import { canonicalZone, formatUtcOffset, isValidZone, offsetMinutes, sameZone } from "./zone";

export { CITIES };

export interface Place {
  /** Slug untuk kota pilihan, `zone:<IANA>` untuk zona dari daftar browser. */
  id: string;
  name: string;
  country: string;
  zone: string;
}

/** Saran saat kolom cari kosong. */
export const SUGGESTED = ["jakarta", "makassar", "jayapura", "singapura", "tokyo", "mekah", "london", "new-york"];

/** Jam yang tampil saat tool pertama dibuka: kota lokal lalu dua kota besar. */
export function defaultPlaces(local: string): Place[] {
  const first = placeForZone(local);
  const extra = ["london", "new-york", "tokyo"]
    .map((id) => findCity(id)!)
    .filter((place) => !sameZone(place.zone, first.zone))
    .slice(0, 2);
  return [first, ...extra].map(toPlace);
}

export function findCity(id: string) {
  return CITIES.find((place) => place.id === id);
}

/** Kota pilihan pertama dengan zona itu (Asia/Jakarta → Jakarta), atau tempat dari nama zonanya. */
export function placeForZone(zone: string): Place {
  const known = CITIES.find((place) => sameZone(place.zone, zone));
  return known ? toPlace(known) : zonePlace(zone);
}

const REGIONS: Record<string, string> = {
  Africa: "Afrika",
  America: "Amerika",
  Antarctica: "Antartika",
  Arctic: "Arktik",
  Asia: "Asia",
  Atlantic: "Atlantik",
  Australia: "Australia",
  Europe: "Eropa",
  Indian: "Samudra Hindia",
  Pacific: "Pasifik",
};

/** "America/Argentina/Buenos_Aires" → Buenos Aires, Amerika. */
export function zonePlace(zone: string): Place {
  const segments = zone.split("/");
  const name = segments[segments.length - 1].replace(/_/g, " ");
  const region = segments.length > 1 ? (REGIONS[segments[0]] ?? segments[0]) : "Zona waktu";
  return { id: `zone:${zone}`, name, country: region, zone };
}

function toPlace({ id, name, country, zone }: Place): Place {
  return { id, name, country, zone };
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_/]/g, " ");
}

/**
 * "+7", "utc+7", "gmt-3:30", "UTC+5.45" → menit; null bila bukan selisih UTC.
 * "utc"/"gmt" saja tidak dianggap selisih agar tetap dicari sebagai nama.
 */
export function parseOffsetQuery(query: string): number | null {
  const match = /^(?:utc|gmt)?\s*([+\-−])\s*(\d{1,2})(?:[:.](\d{2}))?$/i.exec(query.trim());
  if (!match) return null;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  if (hours > 14 || minutes >= 60) return null;
  return (match[1] === "+" ? 1 : -1) * (hours * 60 + minutes);
}

let zoneListCache: string[] | undefined;

/** Semua zona IANA yang dikenal browser (kosong di browser lama tanpa supportedValuesOf). */
export function browserZones(): string[] {
  if (!zoneListCache) {
    try {
      zoneListCache = Intl.supportedValuesOf("timeZone");
    } catch {
      zoneListCache = [];
    }
  }
  return zoneListCache;
}

/**
 * Cari kota: setiap kata harus muncul di nama, negara, zona, atau alias. Kota yang namanya
 * cocok didahulukan (awal nama, lalu awal kata), lalu yang cocok lewat negara atau alias, lalu
 * zona browser yang tidak diwakili kota pilihan. Kueri berupa selisih UTC ("utc+9")
 * mencocokkan zona dengan selisih itu pada saat `at`.
 */
export function searchPlaces(query: string, at: number, { limit = 10, zones = browserZones() } = {}): Place[] {
  const offset = parseOffsetQuery(query);
  const phrase = normalize(query).trim().replace(/\s+/g, " ");
  const terms = phrase.split(" ").filter(Boolean);
  if (offset === null && terms.length === 0) return [];

  const matches = (place: Place, aliases = "") => {
    if (offset !== null) return offsetMinutes(place.zone, at) === offset;
    // Nama zona hanya dicari di kota wakilnya: "jakarta" tidak ikut memunculkan Bandung dan Surabaya.
    const zone = placeForZone(place.zone).id === place.id ? place.zone : "";
    const haystack = normalize([place.name, place.country, zone, aliases].join(" "));
    return terms.every((term) => haystack.includes(term));
  };
  const rank = (place: Place) => {
    if (offset !== null) return 0;
    const name = normalize(place.name);
    if (name.startsWith(phrase)) return 0;
    if (name.split(/[\s-]+/).some((word) => word.startsWith(terms[0]))) return 1;
    return 2;
  };

  const cities = CITIES.filter((place) => isValidZone(place.zone) && matches(place, place.aliases))
    .map((place, index) => ({ place, index, rank: rank(place) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((item) => item.place);
  const known = new Set(CITIES.map((place) => canonicalZone(place.zone)));
  const extra = zones
    .filter((zone) => zone.includes("/") && !zone.startsWith("Etc/") && !known.has(canonicalZone(zone)))
    .map(zonePlace)
    .filter((place) => isValidZone(place.zone) && matches(place));
  return [...cities, ...extra].slice(0, limit).map(toPlace);
}

/** Label singkat zona untuk baris hasil: "Indonesia · UTC+7". */
export function placeDetail(place: Place, at: number) {
  return `${place.country} · ${formatUtcOffset(offsetMinutes(place.zone, at))}`;
}

/** Urutkan dari barat ke timur (selisih UTC terkecil dulu) pada saat `at`; urutan sama tetap stabil. */
export function sortByOffset(places: Place[], at: number) {
  return places
    .map((place, index) => ({ place, index, offset: offsetMinutes(place.zone, at) }))
    .sort((a, b) => a.offset - b.offset || a.index - b.index)
    .map((item) => item.place);
}

export function isSortedByOffset(places: Place[], at: number) {
  return places.every((place, i) => i === 0 || offsetMinutes(places[i - 1].zone, at) <= offsetMinutes(place.zone, at));
}

/** Tukar kartu `index` dengan tetangganya; di luar batas tidak berubah. */
export function movePlace(places: Place[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (index < 0 || index >= places.length || target < 0 || target >= places.length) return places;
  const next = [...places];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Jarak lingkaran besar antara dua koordinat [lintang, bujur], dalam km. */
export function distanceKm([lat1, lon1]: readonly [number, number], [lat2, lon2]: readonly [number, number]) {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Seberapa jauh (km) kota sezona boleh lebih jauh dari kota terdekat agar tetap dipilih. */
const SAME_ZONE_SLACK = 150;

/**
 * Kota pilihan terdekat dari lokasi GPS. Kota yang zonanya sama dengan zona perangkat
 * didahulukan bila tidak jauh lebih jauh dari kota terdekat: zona perangkat biasanya diatur
 * otomatis dari jaringan, jadi di dekat perbatasan (mis. Kerkrade, Belanda, 6 km dari Aachen)
 * hasilnya tetap kota di negara dan zona yang benar.
 */
export function nearestPlace(position: readonly [number, number], local?: string): { place: Place; km: number } | null {
  let best: { place: Place; km: number } | null = null;
  let bestInZone: { place: Place; km: number } | null = null;
  for (const place of CITIES) {
    const coords = COORDS[place.id];
    if (!coords || !isValidZone(place.zone)) continue;
    const km = distanceKm(position, coords);
    if (!best || km < best.km) best = { place, km };
    if (local && sameZone(place.zone, local) && (!bestInZone || km < bestInZone.km)) bestInZone = { place, km };
  }
  const pick = bestInZone && best && bestInZone.km <= best.km + SAME_ZONE_SLACK ? bestInZone : best;
  return pick && { place: toPlace(pick.place), km: pick.km };
}
