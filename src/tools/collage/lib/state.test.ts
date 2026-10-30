import { describe, expect, it } from "vitest";
import type { Photo } from "./images";
import { collageReducer, initialState } from "./state";

const photo = (id: string) => ({ id, name: `${id}.jpg`, url: "", width: 100, height: 100 }) as Photo;
const ids = (state: ReturnType<typeof initialState>) => state.cells.map((cell) => cell.photoId);

describe("collageReducer", () => {
  it("mengisi sel kosong berurutan dan menyisakan foto berlebih di daftar", () => {
    const state = collageReducer(initialState(), { type: "addPhotos", photos: ["a", "b", "c", "d", "e"].map(photo) });
    expect(ids(state)).toEqual(["a", "b", "c", "d"]);
    expect(state.photos).toHaveLength(5);
  });

  it("menaruh foto pertama di sel tujuan", () => {
    const state = collageReducer(initialState(), { type: "addPhotos", photos: [photo("a"), photo("b")], target: 2 });
    expect(ids(state)).toEqual(["b", null, "a", null]);
  });

  it("menukar foto bila foto sudah dipakai di sel lain", () => {
    let state = collageReducer(initialState(), { type: "addPhotos", photos: ["a", "b"].map(photo) });
    state = collageReducer(state, { type: "assign", cell: 1, photoId: "a" });
    expect(ids(state)).toEqual(["b", "a", null, null]);
  });

  it("memperbesar grid lalu mengisi sel baru dengan foto yang belum dipakai", () => {
    let state = collageReducer(initialState(), { type: "addPhotos", photos: ["a", "b", "c", "d", "e", "f"].map(photo) });
    state = collageReducer(state, { type: "settings", patch: { rows: 2, cols: 3 } });
    expect(ids(state)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("menghapus foto juga mengosongkan selnya", () => {
    let state = collageReducer(initialState(), { type: "addPhotos", photos: ["a", "b"].map(photo) });
    state = collageReducer(state, { type: "removePhoto", photoId: "a" });
    expect(ids(state)).toEqual([null, "b", null, null]);
    expect(state.photos.map((p) => p.id)).toEqual(["b"]);
  });

  it("mengganti mode isi/utuh global menghapus pilihan per sel", () => {
    let state = collageReducer(initialState(), { type: "addPhotos", photos: ["a", "b"].map(photo) });
    state = collageReducer(state, { type: "frame", cell: 0, framing: { zoom: 1, x: 0, y: 0, fit: "contain" } });
    expect(state.cells[0].framing.fit).toBe("contain");
    state = collageReducer(state, { type: "settings", patch: { fit: "cover" } });
    expect(state.settings.fit).toBe("cover");
    expect(state.cells.every((cell) => cell.framing.fit === undefined)).toBe(true);
  });
});
