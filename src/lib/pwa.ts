/**
 * PWA: pendaftaran service worker dan tombol "Pasang aplikasi".
 *
 * - Chrome/Edge (Android, Windows, macOS, ChromeOS) mengirim `beforeinstallprompt`; event itu
 *   ditahan di sini supaya tombol di bar atas bisa membuka dialog pasang bawaan browser.
 * - Safari iOS/iPadOS tidak punya event itu. Di sana tombol menampilkan petunjuk
 *   Bagikan → Tambah ke Layar Utama.
 * - Saat sudah berjalan sebagai aplikasi terpasang (display-mode standalone), tombol hilang.
 */
import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** `prompt`: dialog pasang bawaan tersedia. `ios`: tampilkan petunjuk manual. */
export type InstallOption = "prompt" | "ios" | null;

let deferred: BeforeInstallPromptEvent | null = null;
let option: InstallOption = null;
const listeners = new Set<() => void>();

function set(next: InstallOption) {
  option = next;
  listeners.forEach((listener) => listener());
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function isIos() {
  const ua = navigator.userAgent;
  // iPadOS melapor sebagai Mac; bedakan lewat layar sentuh.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Dipanggil sekali dari main.tsx, sebelum render, agar event pasang tidak terlewat. */
export function initPwa() {
  if (!isStandalone() && isIos()) option = "ios";

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    set("prompt");
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    set(null);
  });

  // Service worker hanya di build produksi; di dev, Vite menyajikan modul yang selalu berubah.
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Gagal mendaftar (mis. mode privat Firefox): aplikasi tetap jalan, hanya tanpa offline.
      });
    });
  }
}

/** Membuka dialog pasang bawaan browser. Event hanya bisa dipakai sekali. */
export async function promptInstall() {
  const event = deferred;
  if (!event) return;
  deferred = null;
  await event.prompt();
  await event.userChoice;
  set(null);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallOption(): InstallOption {
  return useSyncExternalStore(subscribe, () => option);
}
