import { describe, expect, it } from "vitest";
import { parseThemeMode, resolveTheme } from "./theme";

describe("parseThemeMode", () => {
  it("menerima light dan dark, selain itu sistem", () => {
    expect(parseThemeMode("light")).toBe("light");
    expect(parseThemeMode("dark")).toBe("dark");
    expect(parseThemeMode(null)).toBe("system");
    expect(parseThemeMode("blue")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("pilihan eksplisit mengalahkan sistem", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("sistem mengikuti prefers-color-scheme", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
