/**
 * Setelan kolase terakhir disimpan di localStorage browser ini, agar tidak perlu diatur
 * ulang setiap membuka tool. Hanya setelan: foto dan posisi foto di sel tidak pernah disimpan.
 */
import { readJson, removeKey, writeJson } from "../../../lib/storage";
import { DEFAULT_SETTINGS, type CollageSettings } from "./layout";
import { MAX_GRID, MAX_RATIO_PART, MIN_GRID, SIZE_PRESETS, SPACING_LIMITS } from "./presets";

/** Naikkan versinya bila arti sebuah kolom berubah; versi lama lalu diabaikan. */
export const STORAGE_KEY = "kolase:setelan:v1";

const int = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;

const oneOf = <T,>(value: unknown, options: readonly T[], fallback: T) => (options.includes(value as T) ? (value as T) : fallback);

/**
 * Ambil setelan dari nilai apa pun (hasil JSON.parse yang mungkin rusak, kuno, atau diedit
 * tangan). Setiap kolom yang tidak sah kembali ke nilai bawaan, kolom lain tetap dipakai.
 */
export function sanitizeSettings(raw: unknown): CollageSettings {
  const d = DEFAULT_SETTINGS;
  if (!raw || typeof raw !== "object") return d;
  const s = raw as Record<string, unknown>;
  const background =
    s.background === "transparent" || (typeof s.background === "string" && /^#[0-9a-f]{6}$/i.test(s.background)) ? s.background : d.background;
  return {
    rows: int(s.rows, MIN_GRID, MAX_GRID, d.rows),
    cols: int(s.cols, MIN_GRID, MAX_GRID, d.cols),
    ratioW: int(s.ratioW, 1, MAX_RATIO_PART, d.ratioW),
    ratioH: int(s.ratioH, 1, MAX_RATIO_PART, d.ratioH),
    gap: int(s.gap, 0, SPACING_LIMITS.gap, d.gap),
    padding: int(s.padding, 0, SPACING_LIMITS.padding, d.padding),
    radius: int(s.radius, 0, SPACING_LIMITS.radius, d.radius),
    background: background as string,
    longEdge: oneOf(s.longEdge, SIZE_PRESETS, d.longEdge as (typeof SIZE_PRESETS)[number]),
    format: oneOf(s.format, ["png", "jpeg"] as const, d.format),
    fit: oneOf(s.fit, ["cover", "contain"] as const, d.fit),
  };
}

export function isDefaultSettings(settings: CollageSettings) {
  return (Object.keys(DEFAULT_SETTINGS) as (keyof CollageSettings)[]).every((key) => settings[key] === DEFAULT_SETTINGS[key]);
}

export function loadSettings(): CollageSettings {
  return sanitizeSettings(readJson(STORAGE_KEY));
}

/** Setelan bawaan tidak disimpan: kunci dihapus agar penyimpanan tetap bersih. */
export function saveSettings(settings: CollageSettings) {
  if (isDefaultSettings(settings)) removeKey(STORAGE_KEY);
  else writeJson(STORAGE_KEY, settings);
}
