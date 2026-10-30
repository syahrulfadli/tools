import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MAX_PLACES, STORAGE_KEY, defaultState, isDefaultState, loadState, sanitizeState, saveState } from "./persist";
import { CITIES } from "./places";

const LOCAL = "Asia/Jakarta";

/** localStorage tiruan untuk lingkungan Node. */
class MemoryStorage {
  data = new Map<string, string>();
  getItem = (key: string) => this.data.get(key) ?? null;
  setItem = (key: string, value: string) => void this.data.set(key, String(value));
  removeItem = (key: string) => void this.data.delete(key);
}

let storage: MemoryStorage;
beforeEach(() => {
  storage = new MemoryStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage;
});
afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe("sanitizeState", () => {
  it("memakai bawaan untuk nilai yang bukan objek", () => {
    expect(sanitizeState(null, LOCAL)).toEqual(defaultState(LOCAL));
    expect(sanitizeState("rusak", LOCAL)).toEqual(defaultState(LOCAL));
  });

  it("membuang kota rusak, zona tak dikenal, dan duplikat", () => {
    const state = sanitizeState(
      {
        places: [
          { id: "tokyo", name: "Tokyo", country: "Jepang", zone: "Asia/Tokyo" },
          { id: "tokyo", name: "Tokyo lagi", country: "Jepang", zone: "Asia/Tokyo" },
          { id: "atlantis", name: "Atlantis", country: "Laut", zone: "Ocean/Atlantis" },
          { id: "x", name: "", country: "X", zone: "UTC" },
          "london",
          null,
        ],
        face: "analog",
        hour12: true,
        seconds: "ya",
      },
      LOCAL,
    );
    expect(state.places.map((place) => place.id)).toEqual(["tokyo"]);
    expect(state.face).toBe("analog");
    expect(state.hour12).toBe(true);
    expect(state.seconds).toBe(true);
  });

  it("daftar kosong tetap kosong", () => {
    expect(sanitizeState({ places: [] }, LOCAL).places).toEqual([]);
  });

  it("membatasi jumlah kota", () => {
    const places = CITIES.slice(0, MAX_PLACES + 5).map(({ id, name, country, zone }) => ({ id, name, country, zone }));
    expect(sanitizeState({ places }, LOCAL).places).toHaveLength(MAX_PLACES);
  });
});

describe("simpan dan muat", () => {
  it("state bawaan tidak disimpan", () => {
    saveState(defaultState(LOCAL), LOCAL);
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
  });

  it("perubahan disimpan lalu dimuat kembali", () => {
    const state = { ...defaultState(LOCAL), face: "analog" as const, places: defaultState(LOCAL).places.slice(0, 2) };
    expect(isDefaultState(state, LOCAL)).toBe(false);
    saveState(state, LOCAL);
    expect(loadState(LOCAL)).toEqual(state);
  });

  it("kembali ke bawaan menghapus kunci", () => {
    storage.setItem(STORAGE_KEY, "{}");
    saveState(defaultState(LOCAL), LOCAL);
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
  });
});
