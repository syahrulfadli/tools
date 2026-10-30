/**
 * Tema terang / gelap / sistem. Pilihan user disimpan di localStorage (`theme`), hanya
 * preferensi tampilan di browser ini; "sistem" berarti tidak ada yang disimpan.
 * Tema yang berlaku dipasang sebagai `data-theme` di <html>; tokens.css membaca atribut itu.
 *
 * public/theme-init.js menjalankan logika yang sama sebelum render pertama agar tidak
 * ada kedipan tema terang. Ubah keduanya bersamaan.
 */
import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
/** Warna bar status / judul jendela PWA = `--ground` tiap tema. */
const THEME_COLOR: Record<Theme, string> = { light: "#f3f4f2", dark: "#111213" };

export function parseThemeMode(value: string | null): ThemeMode {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(mode: ThemeMode, systemDark: boolean): Theme {
  if (mode === "system") return systemDark ? "dark" : "light";
  return mode;
}

let mode: ThemeMode = "system";
let media: MediaQueryList | undefined;
const listeners = new Set<() => void>();

function readStored(): ThemeMode {
  try {
    return parseThemeMode(localStorage.getItem(STORAGE_KEY));
  } catch {
    return "system";
  }
}

function apply() {
  const theme = resolveTheme(mode, media?.matches ?? false);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}

/**
 * Ganti tema tanpa transisi: tanpa ini elemen yang punya `transition` memudar sementara yang
 * lain langsung berganti, sehingga halaman sempat tampak setengah terang setengah gelap.
 */
function switchTheme() {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  apply();
  getComputedStyle(root).color; // paksa style baru dihitung selagi transisi mati
  requestAnimationFrame(() => root.classList.remove("theme-switching"));
}

function emit() {
  listeners.forEach((listener) => listener());
}

/** Dipanggil sekali dari main.tsx. */
export function initTheme() {
  media = window.matchMedia("(prefers-color-scheme: dark)");
  mode = readStored();
  apply();
  media.addEventListener("change", () => {
    if (mode === "system") switchTheme();
  });
  // Ganti tema di satu tab ikut berlaku di tab lain.
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    mode = readStored();
    switchTheme();
    emit();
  });
}

export function setThemeMode(next: ThemeMode) {
  mode = next;
  try {
    if (next === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Penyimpanan diblokir (mode privat): tema tetap berlaku sampai tab ditutup.
  }
  switchTheme();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribe, () => mode);
}
