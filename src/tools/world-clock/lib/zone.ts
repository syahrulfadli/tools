/**
 * Jam di zona waktu lain lewat Intl (data zona IANA bawaan browser), tanpa library.
 * Semua fungsi menerima `at` (stempel Date.now()) agar bisa diuji dan dipakai untuk pratinjau.
 */

export const MINUTE = 60_000;

export interface ZoneTime {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  /** 0–23 */
  hour: number;
  minute: number;
  second: number;
  /** 0 = Minggu */
  weekday: number;
}

// Membuat Intl.DateTimeFormat relatif mahal, sementara tiap kartu memformat tiap detik.
const partsFormatters = new Map<string, Intl.DateTimeFormat>();
const nameFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(zone: string) {
  let formatter = partsFormatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    partsFormatters.set(zone, formatter);
  }
  return formatter;
}

export function isValidZone(zone: string) {
  try {
    partsFormatter(zone);
    return true;
  } catch {
    return false;
  }
}

/**
 * Nama zona lama yang masih dipakai sebagian browser atau sistem operasi (mis. Chrome melaporkan
 * "Asia/Calcutta", server "Etc/UTC") → nama yang dipakai daftar kota.
 */
const RENAMED: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Dacca": "Asia/Dhaka",
  "Asia/Thimbu": "Asia/Thimphu",
  "Asia/Ulan_Bator": "Asia/Ulaanbaatar",
  "Asia/Macao": "Asia/Macau",
  "Asia/Istanbul": "Europe/Istanbul",
  "Asia/Tel_Aviv": "Asia/Jerusalem",
  "Europe/Kiev": "Europe/Kyiv",
  "Europe/Nicosia": "Asia/Nicosia",
  "America/Godthab": "America/Nuuk",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Cordoba": "America/Argentina/Cordoba",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Enderbury": "Pacific/Kanton",
  "Africa/Asmera": "Africa/Asmara",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Etc/UTC": "UTC",
  "Etc/UCT": "UTC",
  "Etc/GMT": "UTC",
  "Etc/Universal": "UTC",
  "Etc/Zulu": "UTC",
  "Etc/Greenwich": "UTC",
  GMT: "UTC",
  UCT: "UTC",
  Universal: "UTC",
  Zulu: "UTC",
  Greenwich: "UTC",
};

export function canonicalZone(zone: string) {
  return RENAMED[zone] ?? zone;
}

/** Dua nama zona yang menunjuk zona yang sama ("Asia/Calcutta" dan "Asia/Kolkata"). */
export function sameZone(a: string, b: string) {
  return canonicalZone(a) === canonicalZone(b);
}

/** Zona waktu perangkat; "UTC" bila browser tidak menyebutkannya. */
export function localZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function zoneTime(zone: string, at: number): ZoneTime {
  const values: Record<string, number> = {};
  for (const part of partsFormatter(zone).formatToParts(at)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  const { year, month, day, minute, second } = values;
  // Sebagian mesin lama menulis tengah malam sebagai "24" walau hourCycle h23.
  const hour = values.hour % 24;
  return { year, month, day, hour, minute, second, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
}

/** Selisih zona terhadap UTC dalam menit pada saat `at` (ikut berubah saat musim panas/DST). */
export function offsetMinutes(zone: string, at: number) {
  const t = zoneTime(zone, at);
  const asUtc = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second);
  return Math.round((asUtc - Math.floor(at / 1000) * 1000) / MINUTE);
}

const MINUS = "−";
const two = (n: number) => String(n).padStart(2, "0"); // taste-skill-ignore: digit jam

/** "UTC", "UTC+7", "UTC+5:45", "UTC−3:30". */
export function formatUtcOffset(minutes: number) {
  if (minutes === 0) return "UTC";
  const abs = Math.abs(minutes);
  const rest = abs % 60;
  return `UTC${minutes < 0 ? MINUS : "+"}${Math.floor(abs / 60)}${rest ? `:${two(rest)}` : ""}`;
}

/** Selisih bertanda dalam kata: "+6 jam", "−5 jam 30 menit", "+45 menit", "0 jam". */
export function formatDiff(minutes: number) {
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const rest = abs % 60;
  const words = [hours && `${hours} jam`, rest && `${rest} menit`].filter(Boolean).join(" ");
  if (!words) return "0 jam";
  return `${minutes < 0 ? MINUS : "+"}${words}`;
}

/** Singkatan zona yang lazim (WIB, WITA, WIT, EST, CEST); kosong bila browser hanya punya "GMT+9". */
export function zoneAbbreviation(zone: string, at: number) {
  let formatter = nameFormatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("id-ID", { timeZone: zone, timeZoneName: "short" });
    nameFormatters.set(zone, formatter);
  }
  const name = formatter.formatToParts(at).find((part) => part.type === "timeZoneName")?.value ?? "";
  return /^[A-Z]{2,5}$/.test(name) && name !== "UTC" ? name : "";
}

/** Selisih tanggal kalender `a` terhadap `b`: 1 = besok, −1 = kemarin. */
export function dayDiff(a: ZoneTime, b: ZoneTime) {
  return Math.round((Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / 86_400_000);
}

export function dayRelation(diff: number) {
  if (diff === 0) return "hari ini";
  if (diff === 1) return "besok";
  if (diff === -1) return "kemarin";
  return diff > 0 ? `${diff} hari lagi` : `${-diff} hari lalu`;
}

/** Bagian hari menurut kebiasaan bahasa Indonesia. */
export function partOfDay(hour: number) {
  if (hour < 4) return "Dini hari";
  if (hour < 11) return "Pagi";
  if (hour < 15) return "Siang";
  if (hour < 18) return "Sore";
  return "Malam";
}

export function isNight(hour: number) {
  return hour < 5 || hour >= 18;
}

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "Jumat, 30 Okt". */
export function formatDate(t: ZoneTime) {
  return `${DAYS[t.weekday]}, ${t.day} ${MONTHS[t.month - 1]}`;
}

/** Jam untuk ditampilkan: `main` "09:05", `seconds` "07", `period` "AM"/"PM" untuk format 12 jam. */
export function formatClock(t: ZoneTime, hour12: boolean) {
  const hour = hour12 ? t.hour % 12 || 12 : t.hour;
  return {
    main: `${hour12 ? hour : two(hour)}:${two(t.minute)}`,
    seconds: two(t.second),
    period: hour12 ? (t.hour < 12 ? "AM" : "PM") : null,
  };
}
