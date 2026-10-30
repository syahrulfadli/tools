import { describe, expect, it } from "vitest";
import { COORDS } from "./coords";
import {
  CITIES,
  SUGGESTED,
  defaultPlaces,
  distanceKm,
  nearestPlace,
  findCity,
  isSortedByOffset,
  movePlace,
  parseOffsetQuery,
  placeForZone,
  searchPlaces,
  sortByOffset,
  zonePlace,
} from "./places";
import { isValidZone, offsetMinutes } from "./zone";

const AT = Date.UTC(2026, 9, 30, 3, 48, 23);
const ids = (list: readonly { id: string }[]) => list.map((place) => place.id);

describe("daftar kota", () => {
  it("setiap negara punya kota dan nama kota tidak ganda dalam satu negara", () => {
    const countries = new Set(CITIES.map((place) => place.country));
    expect(countries.size).toBeGreaterThan(190);
    const keys = CITIES.map((place) => `${place.country}/${place.name}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("semua zona dikenal dan id unik", () => {
    expect(CITIES.filter((place) => !isValidZone(place.zone))).toEqual([]);
    expect(new Set(ids(CITIES)).size).toBe(CITIES.length);
    expect(SUGGESTED.every((id) => findCity(id))).toBe(true);
  });

  it("defaultPlaces: kota lokal dulu, tanpa zona ganda", () => {
    expect(ids(defaultPlaces("Asia/Jakarta"))).toEqual(["jakarta", "london", "new-york"]);
    expect(ids(defaultPlaces("Europe/London"))).toEqual(["london", "new-york", "tokyo"]);
    expect(ids(defaultPlaces("America/Boise"))).toEqual(["zone:America/Boise", "london", "new-york"]);
    expect(ids(defaultPlaces("Etc/UTC"))).toEqual(["utc", "london", "new-york"]);
  });

  it("placeForZone dan zonePlace", () => {
    expect(placeForZone("Asia/Jakarta").name).toBe("Jakarta");
    expect(placeForZone("Asia/Makassar").name).toBe("Makassar");
    // Nama zona lama yang masih dilaporkan sebagian browser.
    expect(placeForZone("Asia/Calcutta").name).toBe("New Delhi");
    expect(placeForZone("Europe/Kiev").name).toBe("Kyiv");
    expect(zonePlace("America/Argentina/Buenos_Aires")).toEqual({
      id: "zone:America/Argentina/Buenos_Aires",
      name: "Buenos Aires",
      country: "Amerika",
      zone: "America/Argentina/Buenos_Aires",
    });
  });
});

describe("parseOffsetQuery", () => {
  it("membaca selisih UTC", () => {
    expect(parseOffsetQuery("+7")).toBe(420);
    expect(parseOffsetQuery("UTC+9")).toBe(540);
    expect(parseOffsetQuery("gmt -3:30")).toBe(-210);
    expect(parseOffsetQuery("utc+5.45")).toBe(345);
    expect(parseOffsetQuery("UTC−5")).toBe(-300);
  });

  it("bukan selisih", () => {
    expect(parseOffsetQuery("utc")).toBeNull();
    expect(parseOffsetQuery("tokyo")).toBeNull();
    expect(parseOffsetQuery("+15")).toBeNull();
  });
});

describe("searchPlaces", () => {
  const zones = ["Asia/Jakarta", "America/Boise", "Asia/Tokyo", "Asia/Calcutta", "Etc/GMT+5"];

  it("kosong untuk kueri kosong", () => {
    expect(searchPlaces("  ", AT, { zones })).toEqual([]);
  });

  it("mencari nama, negara, dan alias tanpa peduli huruf besar atau aksen", () => {
    expect(ids(searchPlaces("makkah", AT, { zones }))).toEqual(["mekah"]);
    expect(ids(searchPlaces("São Paulo", AT, { zones }))).toEqual(["sao-paulo"]);
    expect(ids(searchPlaces("wita", AT, { zones }))).toContain("makassar");
    expect(ids(searchPlaces("jepang", AT, { zones })).slice(0, 2)).toEqual(["tokyo", "osaka"]);
    expect(ids(searchPlaces("veghel", AT, { zones }))).toEqual(["veghel"]);
    // Amsterdam tetap wakil Europe/Amsterdam, jadi kota Belanda lain tidak ikut lewat nama zona.
    expect(ids(searchPlaces("amsterdam", AT, { zones }))).toEqual(["amsterdam"]);
  });

  it("zona browser jadi cadangan bila tidak ada kota pilihan", () => {
    expect(searchPlaces("boise", AT, { zones })).toEqual([{ id: "zone:America/Boise", name: "Boise", country: "Amerika", zone: "America/Boise" }]);
    // Nama lama dari zona yang sudah diwakili kota pilihan, dan zona Etc/, tidak ikut.
    expect(searchPlaces("calcutta", AT, { zones }).map((place) => place.id)).toEqual(["kolkata"]);
    expect(searchPlaces("gmt", AT, { zones }).map((place) => place.id)).toEqual(["utc"]);
    // Asia/Tokyo sudah diwakili kota Tokyo, jadi tidak muncul dua kali.
    expect(ids(searchPlaces("tokyo", AT, { zones }))).toEqual(["tokyo"]);
  });

  it("nama yang cocok didahulukan daripada alias atau negara", () => {
    expect(ids(searchPlaces("washington", AT, { zones }))).toEqual(["washington-dc", "seattle"]);
    expect(ids(searchPlaces("paris", AT, { zones }))[0]).toBe("paris");
    // "Den Haag" ditemukan lewat awal kata kedua, sebelum kota yang hanya cocok lewat alias.
    expect(ids(searchPlaces("haag", AT, { zones }))).toEqual(["den-haag"]);
  });

  it("kueri selisih UTC mencocokkan zona dengan selisih itu", () => {
    const result = ids(searchPlaces("utc+9", AT, { zones, limit: 20 }));
    expect(result).toContain("tokyo");
    expect(result).toContain("jayapura");
    expect(result).not.toContain("jakarta");
  });

  it("menghormati batas jumlah hasil", () => {
    expect(searchPlaces("indonesia", AT, { zones, limit: 3 })).toHaveLength(3);
  });
});

describe("urutan", () => {
  const list = ["tokyo", "london", "jakarta", "new-york"].map((id) => findCity(id)!);

  it("sortByOffset dari barat ke timur", () => {
    expect(ids(sortByOffset(list, AT))).toEqual(["new-york", "london", "jakarta", "tokyo"]);
    expect(isSortedByOffset(list, AT)).toBe(false);
    expect(isSortedByOffset(sortByOffset(list, AT), AT)).toBe(true);
  });

  it("sortByOffset stabil untuk selisih sama", () => {
    const same = ["surabaya", "jakarta", "bandung"].map((id) => findCity(id)!);
    expect(ids(sortByOffset(same, AT))).toEqual(["surabaya", "jakarta", "bandung"]);
  });

  it("movePlace menukar dengan tetangga dan diam di batas", () => {
    expect(ids(movePlace(list, 1, -1))).toEqual(["london", "tokyo", "jakarta", "new-york"]);
    expect(ids(movePlace(list, 3, 1))).toEqual(ids(list));
    expect(movePlace(list, 0, -1)).toBe(list);
  });
});

describe("koordinat", () => {
  it("setiap kota (kecuali UTC) punya koordinat yang masuk akal", () => {
    expect(CITIES.filter((place) => place.id !== "utc" && !COORDS[place.id]).map((place) => place.id)).toEqual([]);
    expect(Object.keys(COORDS).filter((id) => !findCity(id))).toEqual([]);
    for (const [lat, lon] of Object.values(COORDS)) {
      expect(Math.abs(lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(lon)).toBeLessThanOrEqual(180);
    }
  });

  it("bujur cocok dengan selisih UTC zona (menangkap tanda atau angka tertukar)", () => {
    const wrong = CITIES.filter((place) => COORDS[place.id]).filter((place) => {
      // Waktu standar = selisih terkecil antara Januari dan Juli (tanpa musim panas).
      const standard = Math.min(offsetMinutes(place.zone, Date.UTC(2026, 0, 15)), offsetMinutes(place.zone, Date.UTC(2026, 6, 15))) / 60;
      const solar = COORDS[place.id][1] / 15;
      const diff = Math.abs(((standard - solar + 36) % 24) - 12);
      return diff > 3;
    });
    expect(wrong.map((place) => place.id)).toEqual([]);
  });
});

describe("nearestPlace", () => {
  it("menemukan kota dari koordinat GPS", () => {
    expect(nearestPlace([51.6, 5.53], "Europe/Amsterdam")).toMatchObject({ place: { id: "veghel" } });
    expect(nearestPlace([-8.67, 115.21], "Asia/Makassar")?.place.id).toBe("denpasar");
    expect(nearestPlace([-6.2, 106.82])?.km).toBeLessThan(5);
  });

  it("mendahulukan kota sezona dengan perangkat di dekat perbatasan", () => {
    // Kerkrade, Belanda: 6 km dari Aachen (Jerman), ±25 km dari Maastricht.
    expect(nearestPlace([50.87, 6.06], "Europe/Amsterdam")?.place.id).toBe("maastricht");
    expect(nearestPlace([50.87, 6.06], "Europe/Berlin")?.place.id).toBe("aachen");
    expect(nearestPlace([50.87, 6.06])?.place.id).toBe("aachen");
  });

  it("memakai kota terdekat bila kota sezona terlalu jauh", () => {
    // Zona perangkat masih Jakarta saat sudah di Tokyo.
    expect(nearestPlace([35.68, 139.7], "Asia/Jakarta")?.place.id).toBe("tokyo");
  });

  it("distanceKm", () => {
    expect(distanceKm([-6.21, 106.85], [-6.92, 107.61])).toBeGreaterThan(110);
    expect(distanceKm([-6.21, 106.85], [-6.92, 107.61])).toBeLessThan(125);
  });
});
