import { GLYPHS } from "./glyphs";
import { LOOK } from "./look";
import { glyphIndex } from "./noise";

export const STILL_COLS = 96;
export const STILL_ROWS = 60;
export const STILL_WIDTH = STILL_COLS * LOOK.cellSize;
export const STILL_HEIGHT = STILL_ROWS * LOOK.cellSize;

const round = (value: number) => Number(value.toFixed(2));

export const renderStill = (): string => {
  const size = round(LOOK.cellSize * (1 - LOOK.padding * 2));
  const pad = LOOK.cellSize * LOOK.padding;
  const symbols = GLYPHS.map((svg, i) => {
    const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? "0 0 52 52";
    const body = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
    return body ? `<symbol id="g${i}" viewBox="${viewBox}">${body}</symbol>` : "";
  }).join("");

  const uses: string[] = [];
  for (let row = -STILL_ROWS / 2; row < STILL_ROWS / 2; row++) {
    for (let col = -STILL_COLS / 2; col < STILL_COLS / 2; col++) {
      const index = glyphIndex(col, row, 0);
      if (!GLYPHS[index]?.includes("<path") && !GLYPHS[index]?.includes("<circle")) continue;
      const x = round(STILL_WIDTH / 2 + col * LOOK.cellSize + pad);
      const y = round(STILL_HEIGHT / 2 + row * LOOK.cellSize + pad);
      uses.push(`<use href="#g${index}" x="${x}" y="${y}" width="${size}" height="${size}"/>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${STILL_WIDTH}" height="${STILL_HEIGHT}" viewBox="0 0 ${STILL_WIDTH} ${STILL_HEIGHT}"><defs>${symbols}</defs>${uses.join("")}</svg>`;
};
