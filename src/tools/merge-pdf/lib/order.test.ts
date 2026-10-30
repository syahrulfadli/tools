import { describe, expect, it } from "vitest";
import { moveItem } from "./order";

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
