import { describe, expect, it } from "vitest";
import { dropIndex, moveItem } from "./order";

describe("dropIndex", () => {
  const centers = [40, 120, 200, 280];
  it("tetap di tempat selama belum melewati tengah baris tetangga", () => {
    expect(dropIndex(centers, 1, 100)).toBe(1);
    expect(dropIndex(centers, 1, 190)).toBe(1);
  });
  it("pindah setelah melewati tengah baris tetangga", () => {
    expect(dropIndex(centers, 1, 210)).toBe(2);
    expect(dropIndex(centers, 1, 30)).toBe(0);
  });
  it("menjepit di ujung daftar", () => {
    expect(dropIndex(centers, 0, 999)).toBe(3);
    expect(dropIndex(centers, 3, -50)).toBe(0);
  });
});

describe("moveItem", () => {
  it("memindahkan ke atas dan ke bawah", () => {
    expect(moveItem(["a", "b", "c"], 2, 1)).toEqual(["a", "c", "b"]);
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
  });
  it("menjepit di tepi dan mengabaikan indeks tak sah", () => {
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 1, 5)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 7, 0)).toEqual(["a", "b"]);
  });
  it("tidak mengubah array asal", () => {
    const list = ["a", "b"];
    moveItem(list, 0, 1);
    expect(list).toEqual(["a", "b"]);
  });
});
