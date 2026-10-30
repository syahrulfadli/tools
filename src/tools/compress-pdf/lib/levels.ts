/** Tingkat kompresi untuk kedua mode. Mode "gambar" memakai maxEdge+quality; mode "ratakan" memakai dpi+jpeg. */
export type Level = "high" | "balanced" | "small";
export type Mode = "images" | "flatten";

export interface LevelPreset {
  /** Sisi terpanjang maksimum gambar di dalam PDF (px) dan kualitas JPEG-nya (0–1). */
  maxEdge: number;
  quality: number;
  /** Resolusi render halaman dan kualitas JPEG saat PDF diratakan. */
  dpi: number;
  jpeg: number;
}

export const LEVELS: Record<Level, LevelPreset> = {
  high: { maxEdge: 2400, quality: 0.85, dpi: 150, jpeg: 0.8 },
  balanced: { maxEdge: 1600, quality: 0.72, dpi: 110, jpeg: 0.65 },
  small: { maxEdge: 1000, quality: 0.55, dpi: 72, jpeg: 0.5 },
};
