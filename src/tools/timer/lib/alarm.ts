/**
 * Bunyi alarm dengan Web Audio (tanpa file suara): tiga bip pendek tiap detik.
 * AudioContext dibuka saat user menekan Mulai (browser hanya mengizinkan suara setelah
 * interaksi), lalu dipakai ulang.
 */

let ctx: AudioContext | null = null;

/** Panggil dari handler klik/tombol agar suara diizinkan browser. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

function beep(at: number, frequency: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.25, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.18);
}

export function playPattern() {
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  beep(t, 880);
  beep(t + 0.22, 880);
  beep(t + 0.44, 1175);
}

export function vibrate() {
  navigator.vibrate?.([200, 100, 200, 100, 400]);
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  return "Notification" in window ? Notification.permission : "unsupported";
}

export async function requestNotifications() {
  if (!("Notification" in window)) return "unsupported" as const;
  return Notification.requestPermission();
}

/** `tag` membedakan sumber notifikasi (Timer, Pomodoro) agar yang satu tidak menimpa yang lain. */
export function notify(title: string, body: string, tag = "productivity-tools-timer") {
  if (notificationPermission() !== "granted") return;
  try {
    const n = new Notification(title, { body, tag, requireInteraction: true });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Beberapa browser ponsel hanya mengizinkan notifikasi lewat service worker.
  }
}
