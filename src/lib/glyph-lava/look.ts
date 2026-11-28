import { GLYPHS } from "./glyphs";

export const LOOK = {
  cellSize: 32,
  noiseScale: 400,
  speed: 0.05,
  layers: 4,
  remapMin: 0.4,
  remapMax: 0.8,
  padding: 0.05,
} as const;

export const GLYPH_COUNT = GLYPHS.length;

export const CELL_TO_NOISE = LOOK.cellSize / LOOK.noiseScale;
