import { useEffect, useState } from "react";

/**
 * Waktu sekarang, diperbarui tepat setelah tiap pergantian detik (bukan tiap 1000 ms dari
 * saat mount) agar semua kartu berganti detik bersamaan dengan jam sistem. Saat tab kembali
 * terlihat, langsung disegarkan karena timer browser diperlambat di tab latar.
 */
export function useSecondTick() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    function tick() {
      const t = Date.now();
      setNow(t);
      timeout = setTimeout(tick, 1000 - (t % 1000) + 5);
    }
    function onVisibility() {
      if (document.hidden) return;
      clearTimeout(timeout);
      tick();
    }
    tick();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return now;
}
