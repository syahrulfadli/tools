import { describe, expect, it } from "vitest";
import { looksLikeSvg } from "./render";

describe("looksLikeSvg", () => {
  it("mengenali kode SVG yang ditempel", () => {
    expect(looksLikeSvg('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toBe(true);
    expect(looksLikeSvg('  \n<svg width="2"/>')).toBe(true);
    expect(looksLikeSvg('<?xml version="1.0"?>\n<!-- dari Figma -->\n<svg xmlns="http://www.w3.org/2000/svg"/>')).toBe(true);
    expect(looksLikeSvg('<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd"><svg/>')).toBe(true);
  });

  it("menolak teks biasa dan elemen lain", () => {
    expect(looksLikeSvg("halo <svg>")).toBe(false);
    expect(looksLikeSvg("<svgfoo>")).toBe(false);
    expect(looksLikeSvg("<div><svg></svg></div>")).toBe(false);
  });
});
