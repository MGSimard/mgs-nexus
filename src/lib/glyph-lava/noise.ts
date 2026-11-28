import { CELL_TO_NOISE, GLYPH_COUNT, LOOK } from "./look";

const mod289 = (x: number) => x - Math.floor(x * (1 / 289)) * 289;
const permute = (x: number) => mod289((x * 34 + 1) * x);
const taylorInvSqrt = (r: number) => 1.79284291400159 - 0.85373472095314 * r;
const step = (edge: number, x: number) => (x < edge ? 0 : 1);
const sign = (v: number) => Math.floor(v) * 2 + 1;

export const snoise = (vx: number, vy: number, vz: number): number => {
  const C0 = 1 / 6;
  const C1 = 1 / 3;
  const s = (vx + vy + vz) * C1;
  const ix = Math.floor(vx + s);
  const iy = Math.floor(vy + s);
  const iz = Math.floor(vz + s);
  const t = (ix + iy + iz) * C0;
  const x0 = [vx - ix + t, vy - iy + t, vz - iz + t] as const;
  const g = [step(x0[1], x0[0]), step(x0[2], x0[1]), step(x0[0], x0[2])] as const;
  const l = [1 - g[0], 1 - g[1], 1 - g[2]] as const;
  const i1 = [Math.min(g[0], l[2]), Math.min(g[1], l[0]), Math.min(g[2], l[1])] as const;
  const i2 = [Math.max(g[0], l[2]), Math.max(g[1], l[0]), Math.max(g[2], l[1])] as const;
  const corners = [
    x0,
    [x0[0] - i1[0] + C0, x0[1] - i1[1] + C0, x0[2] - i1[2] + C0],
    [x0[0] - i2[0] + C1, x0[1] - i2[1] + C1, x0[2] - i2[2] + C1],
    [x0[0] - 0.5, x0[1] - 0.5, x0[2] - 0.5],
  ] as const;

  const mx = mod289(ix);
  const my = mod289(iy);
  const mz = mod289(iz);
  const ox = [0, i1[0], i2[0], 1];
  const oy = [0, i1[1], i2[1], 1];
  const oz = [0, i1[2], i2[2], 1];

  const n = 0.142857142857;
  const nsx = n * 2;
  const nsy = n * 0.5 - 1;
  const nsz = n;

  let sum = 0;
  for (let k = 0; k < 4; k++) {
    const p = permute(permute(permute(mz + oz[k]!) + my + oy[k]!) + mx + ox[k]!);
    const j = p - 49 * Math.floor(p * nsz * nsz);
    const xr = Math.floor(j * nsz);
    const yr = Math.floor(j - 7 * xr);
    const x = xr * nsx + nsy;
    const y = yr * nsx + nsy;
    const h = 1 - Math.abs(x) - Math.abs(y);
    const sh = -step(h, 0);
    let gx = x + sign(x) * sh;
    let gy = y + sign(y) * sh;
    let gz = h;
    const norm = taylorInvSqrt(gx * gx + gy * gy + gz * gz);
    gx *= norm;
    gy *= norm;
    gz *= norm;
    const c = corners[k]!;
    const m = Math.max(0.6 - (c[0] * c[0] + c[1] * c[1] + c[2] * c[2]), 0);
    const m2 = m * m;
    sum += m2 * m2 * (gx * c[0] + gy * c[1] + gz * c[2]);
  }
  return 42 * sum;
};

export const glyphIndex = (cellX: number, cellY: number, time: number): number => {
  let sum = 0;
  for (let i = 0; i < LOOK.layers; i++) {
    const span = 2 ** i;
    const bx = (Math.floor(cellX / span) + 0.5) * span;
    const by = (Math.floor(cellY / span) + 0.5) * span;
    sum += (snoise(bx * CELL_TO_NOISE, by * CELL_TO_NOISE, time) * 0.5 + 0.5) / LOOK.layers;
  }
  const level = Math.min(Math.max((sum - LOOK.remapMin) / (LOOK.remapMax - LOOK.remapMin), 0), 1);
  return Math.min(Math.floor(level * GLYPH_COUNT), GLYPH_COUNT - 1);
};
