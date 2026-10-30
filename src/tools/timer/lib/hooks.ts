import { useEffect, useState, useSyncExternalStore } from "react";
import { clockStore } from "./store";

export function useClock() {
  return useSyncExternalStore(clockStore.subscribe, clockStore.getSnapshot);
}

/**
 * Waktu sekarang yang diperbarui tiap frame selama `active`. Nilai tampilan selalu
 * dihitung dari stempel waktu, jadi frame yang terlewat (tab di latar) tidak membuat
 * angka melenceng.
 */
export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    let frame = requestAnimationFrame(function tick() {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return now;
}
