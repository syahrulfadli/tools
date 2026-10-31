export interface GridPreset {
  rows: number;
  cols: number;
}

export interface RatioPreset {
  w: number;
  h: number;
  /** Untuk apa rasio ini biasa dipakai. */
  use: string;
}

export const GRID_PRESETS: GridPreset[] = [
  { rows: 1, cols: 2 },
  { rows: 2, cols: 1 },
  { rows: 2, cols: 2 },
  { rows: 1, cols: 3 },
  { rows: 3, cols: 1 },
  { rows: 2, cols: 3 },
  { rows: 3, cols: 2 },
  { rows: 3, cols: 3 },
  { rows: 4, cols: 4 },
];

export const RATIO_PRESETS: RatioPreset[] = [
  { w: 1, h: 1, use: "Persegi" },
  { w: 4, h: 5, use: "Instagram" },
  { w: 9, h: 16, use: "Story" },
  { w: 3, h: 4, use: "Potret" },
  { w: 2, h: 3, use: "Cetak 4R" },
  { w: 16, h: 9, use: "Layar lebar" },
  { w: 4, h: 3, use: "Lanskap" },
  { w: 3, h: 2, use: "Kamera" },
];

/** Sisi terpanjang hasil ekspor, dalam piksel. 4096 adalah batas aman kanvas di Safari iOS. */
export const SIZE_PRESETS = [1080, 2048, 4096] as const;

export const MIN_GRID = 1;
export const MAX_GRID = 8;
export const MAX_RATIO_PART = 50;

/** Batas slider. Nilai dalam "unit kolase": 1 unit = 1/1000 sisi terpendek kanvas. */
export const SPACING_LIMITS = {
  gap: 80,
  padding: 120,
  radius: 120,
  border: 40,
} as const;

export const BORDER_COLORS = [
  { value: "#ffffff", label: "Putih" },
  { value: "#131416", label: "Hitam" },
  { value: "#e7e6e1", label: "Batu" },
] as const;

export const BACKGROUNDS = [
  { value: "#ffffff", label: "Putih" },
  { value: "#131416", label: "Hitam" },
  { value: "#e7e6e1", label: "Batu" },
  { value: "transparent", label: "Transparan" },
] as const;
