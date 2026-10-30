import { describe, expect, it } from "vitest";
import {
  dayDiff,
  dayRelation,
  formatClock,
  formatDate,
  formatDiff,
  formatUtcOffset,
  isValidZone,
  offsetMinutes,
  partOfDay,
  zoneAbbreviation,
  zoneTime,
} from "./zone";

// Jumat, 30 Oktober 2026 03:48:23 UTC.
const AT = Date.UTC(2026, 9, 30, 3, 48, 23);

describe("zoneTime", () => {
  it("membaca jam dan tanggal di zona lain", () => {
    expect(zoneTime("Asia/Jakarta", AT)).toEqual({ year: 2026, month: 10, day: 30, hour: 10, minute: 48, second: 23, weekday: 5 });
    expect(zoneTime("America/New_York", AT)).toMatchObject({ day: 29, hour: 23, weekday: 4 });
    expect(zoneTime("Asia/Kathmandu", AT)).toMatchObject({ hour: 9, minute: 33 });
  });

  it("menulis tengah malam sebagai 0, bukan 24", () => {
    expect(zoneTime("UTC", Date.UTC(2026, 0, 1, 0, 0, 0)).hour).toBe(0);
  });
});

describe("offsetMinutes", () => {
  it("menghitung selisih UTC termasuk zona setengah dan tiga perempat jam", () => {
    expect(offsetMinutes("Asia/Jakarta", AT)).toBe(420);
    expect(offsetMinutes("Asia/Kolkata", AT)).toBe(330);
    expect(offsetMinutes("Asia/Kathmandu", AT)).toBe(345);
    expect(offsetMinutes("UTC", AT)).toBe(0);
  });

  it("ikut berganti saat musim panas (DST)", () => {
    expect(offsetMinutes("America/New_York", Date.UTC(2026, 2, 8, 6, 59))).toBe(-300);
    expect(offsetMinutes("America/New_York", Date.UTC(2026, 2, 8, 7, 0))).toBe(-240);
    expect(offsetMinutes("Europe/London", Date.UTC(2026, 6, 1))).toBe(60);
    expect(offsetMinutes("Europe/London", Date.UTC(2026, 11, 1))).toBe(0);
  });

  it("tidak terpengaruh milidetik", () => {
    expect(offsetMinutes("Asia/Jakarta", AT + 999)).toBe(420);
  });
});

describe("isValidZone", () => {
  it("menolak zona yang tidak dikenal", () => {
    expect(isValidZone("Asia/Jakarta")).toBe(true);
    expect(isValidZone("Asia/Atlantis")).toBe(false);
  });
});

describe("format", () => {
  it("formatUtcOffset", () => {
    expect(formatUtcOffset(0)).toBe("UTC");
    expect(formatUtcOffset(420)).toBe("UTC+7");
    expect(formatUtcOffset(345)).toBe("UTC+5:45");
    expect(formatUtcOffset(-210)).toBe("UTC−3:30");
  });

  it("formatDiff", () => {
    expect(formatDiff(0)).toBe("0 jam");
    expect(formatDiff(360)).toBe("+6 jam");
    expect(formatDiff(-330)).toBe("−5 jam 30 menit");
    expect(formatDiff(45)).toBe("+45 menit");
  });

  it("formatClock 24 dan 12 jam", () => {
    const t = zoneTime("UTC", Date.UTC(2026, 0, 1, 0, 5, 7));
    expect(formatClock(t, false)).toEqual({ main: "00:05", seconds: "07", period: null });
    expect(formatClock(t, true)).toEqual({ main: "12:05", seconds: "07", period: "AM" });
    expect(formatClock(zoneTime("UTC", Date.UTC(2026, 0, 1, 13, 30)), true).main).toBe("1:30");
    expect(formatClock(zoneTime("UTC", Date.UTC(2026, 0, 1, 12, 0)), true).period).toBe("PM");
  });

  it("formatDate dalam bahasa Indonesia", () => {
    expect(formatDate(zoneTime("Asia/Jakarta", AT))).toBe("Jumat, 30 Okt");
  });

  it("zoneAbbreviation hanya untuk singkatan huruf", () => {
    expect(zoneAbbreviation("Asia/Jakarta", AT)).toBe("WIB");
    expect(zoneAbbreviation("Asia/Makassar", AT)).toBe("WITA");
    expect(zoneAbbreviation("Asia/Tokyo", AT)).toBe("");
  });
});

describe("hari", () => {
  it("dayDiff dan dayRelation", () => {
    const jakarta = zoneTime("Asia/Jakarta", AT);
    expect(dayDiff(zoneTime("America/New_York", AT), jakarta)).toBe(-1);
    expect(dayDiff(jakarta, jakarta)).toBe(0);
    expect(dayRelation(-1)).toBe("kemarin");
    expect(dayRelation(1)).toBe("besok");
    expect(dayRelation(2)).toBe("2 hari lagi");
  });

  it("dayDiff melewati pergantian bulan dan tahun", () => {
    const newYear = Date.UTC(2026, 11, 31, 20, 0);
    expect(dayDiff(zoneTime("Asia/Tokyo", newYear), zoneTime("UTC", newYear))).toBe(1);
  });

  it("partOfDay", () => {
    expect(partOfDay(2)).toBe("Dini hari");
    expect(partOfDay(9)).toBe("Pagi");
    expect(partOfDay(12)).toBe("Siang");
    expect(partOfDay(16)).toBe("Sore");
    expect(partOfDay(21)).toBe("Malam");
  });
});
