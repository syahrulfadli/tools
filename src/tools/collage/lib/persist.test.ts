import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./layout";
import { isDefaultSettings, loadSettings, sanitizeSettings, saveSettings, STORAGE_KEY } from "./persist";

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

describe("sanitizeSettings", () => {
  it("memakai bawaan untuk nilai yang bukan objek", () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings("rusak")).toEqual(DEFAULT_SETTINGS);
  });

  it("mempertahankan kolom sah dan mengganti kolom tidak sah satu per satu", () => {
    const result = sanitizeSettings({
      rows: 3,
      cols: 99, // di luar batas
      ratioW: 9,
      ratioH: 16,
      gap: 2.5, // bukan bilangan bulat
      padding: 30,
      radius: -1,
      background: "red", // bukan #rrggbb
      longEdge: 4096,
      format: "gif",
      fit: "contain",
      extra: "diabaikan",
    });
    expect(result).toEqual({
      ...DEFAULT_SETTINGS,
      rows: 3,
      ratioW: 9,
      ratioH: 16,
      padding: 30,
      longEdge: 4096,
      fit: "contain",
    });
  });

  it("menerima latar transparan dan warna heksadesimal", () => {
    expect(sanitizeSettings({ background: "transparent" }).background).toBe("transparent");
    expect(sanitizeSettings({ background: "#1A2b3C" }).background).toBe("#1A2b3C");
  });
});

describe("simpan dan muat", () => {
  it("setelan yang diubah bertahan setelah dimuat ulang", () => {
    const custom = { ...DEFAULT_SETTINGS, rows: 3, cols: 3, ratioW: 1, ratioH: 1, background: "#131416", fit: "contain" as const };
    saveSettings(custom);
    expect(loadSettings()).toEqual(custom);
  });

  it("setelan bawaan tidak meninggalkan apa pun di penyimpanan", () => {
    saveSettings({ ...DEFAULT_SETTINGS, rows: 4 });
    saveSettings(DEFAULT_SETTINGS);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(isDefaultSettings(loadSettings())).toBe(true);
  });

  it("JSON rusak dan penyimpanan yang diblokir tidak membuat tool gagal", () => {
    storage.setItem(STORAGE_KEY, "{bukan json");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings({ ...DEFAULT_SETTINGS, rows: 5 })).not.toThrow();
  });
});
