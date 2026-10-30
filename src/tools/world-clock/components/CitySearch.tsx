import { useMemo, useState, type RefObject } from "react";
import { LoaderCircle, LocateFixed, Search } from "lucide-react";
import { SUGGESTED, findCity, nearestPlace, placeDetail, searchPlaces, type Place } from "../lib/places";
import { formatClock, zoneTime } from "../lib/zone";

/**
 * Kolom cari kota + hasilnya. Kosong: chip saran. Enter menambah hasil pertama yang belum
 * ada, Esc mengosongkan kolom. Fokus tetap di kolom setelah menambah, jadi bisa lanjut mengetik.
 * "Pakai lokasi saya" membaca GPS browser dan menambah kota terdekat; koordinat hanya dipakai di
 * perangkat ini, tidak dikirim atau disimpan.
 */
export function CitySearch({
  inputRef,
  added,
  full,
  at,
  hour12,
  local,
  onAdd,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  added: Set<string>;
  full: boolean;
  at: number;
  hour12: boolean;
  /** Zona perangkat, untuk mendahulukan kota sezona saat mencari kota terdekat dari GPS. */
  local: string;
  onAdd: (place: Place) => void;
}) {
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [locateNote, setLocateNote] = useState<{ text: string; error?: boolean } | null>(null);
  // Geolocation hanya ada di konteks aman (https/localhost).
  const canLocate = typeof navigator !== "undefined" && "geolocation" in navigator;
  // Selisih zona tidak berubah tiap detik; cukup dihitung ulang saat kueri berubah.
  const results = useMemo(() => searchPlaces(query, Date.now()), [query]);
  const suggestions = SUGGESTED.map((id) => findCity(id)!).filter((place) => !added.has(place.id));

  function add(place: Place) {
    onAdd(place);
    setQuery("");
    setLocateNote(null);
    inputRef.current?.focus();
  }

  function locate() {
    setLocating(true);
    setLocateNote(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const found = nearestPlace([coords.latitude, coords.longitude], local);
        if (!found) return setLocateNote({ text: "Tidak ada kota di daftar untuk lokasi ini.", error: true });
        const { place, km } = found;
        const distance = km < 1 ? "kurang dari 1 km" : `±${Math.round(km)} km`;
        if (added.has(place.id)) return setLocateNote({ text: `${place.name} (${distance} dari lokasimu) sudah ada.` });
        onAdd(place);
        setLocateNote({ text: `${place.name}, ${place.country} ditambahkan: kota terdekat di daftar, ${distance} dari lokasimu.` });
      },
      (error) => {
        setLocating(false);
        setLocateNote({
          error: true,
          text:
            error.code === error.PERMISSION_DENIED
              ? "Izin lokasi ditolak. Izinkan lokasi untuk situs ini di pengaturan browser, atau cari kota secara manual."
              : error.code === error.TIMEOUT
                ? "Lokasi belum ditemukan setelah 15 detik. Coba lagi di tempat dengan sinyal lebih baik."
                : "Lokasi tidak tersedia di perangkat ini. Cari kota secara manual.",
        });
      },
      // Akurasi tingkat kota cukup: tidak perlu GPS presisi tinggi yang lambat dan boros baterai.
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
    );
  }

  return (
    <div className="world-search">
      <div className="world-search__field">
        <Search size={16} strokeWidth={1.5} className="world-search__icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          disabled={full}
          placeholder="Kota, negara, atau UTC+9"
          aria-label="Cari kota atau zona waktu"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
            if (event.key !== "Enter") return;
            event.preventDefault();
            const next = results.find((place) => !added.has(place.id));
            if (next) add(next);
          }}
        />
      </div>

      {canLocate && (
        <div className="world-search__locate">
          <button type="button" className="btn" disabled={full || locating} onClick={locate}>
            {locating ? (
              <LoaderCircle size={14} strokeWidth={1.5} className="spin" aria-hidden="true" />
            ) : (
              <LocateFixed size={14} strokeWidth={1.5} aria-hidden="true" />
            )}
            {locating ? "Mencari lokasi…" : "Pakai lokasi saya"}
          </button>
          {locateNote && (
            <p className={`field-note${locateNote.error ? " world-search__error" : ""}`} role="status">
              {locateNote.text}
            </p>
          )}
        </div>
      )}

      {full ? (
        <p className="field-note">Sudah 12 jam, batas maksimal. Hapus satu untuk menambah kota lain.</p>
      ) : query.trim() === "" ? (
        suggestions.length > 0 && (
          <div className="presets world-search__suggest" aria-label="Saran kota">
            {suggestions.map((place) => (
              <button key={place.id} type="button" className="chip" onClick={() => add(place)}>
                {place.name}
              </button>
            ))}
          </div>
        )
      ) : results.length === 0 ? (
        <p className="field-note">Tidak ada kota atau zona yang cocok. Coba nama dalam bahasa Inggris atau selisih seperti UTC+7.</p>
      ) : (
        <ul className="world-results" aria-label="Hasil pencarian">
          {results.map((place) => {
            const exists = added.has(place.id);
            return (
              <li key={place.id}>
                <button type="button" className="world-result" disabled={exists} onClick={() => add(place)}>
                  <span className="world-result__name">{place.name}</span>
                  <span className="world-result__time num">{exists ? "Sudah ada" : formatClock(zoneTime(place.zone, at), hour12).main}</span>
                  <span className="world-result__detail num">{placeDetail(place, at)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
