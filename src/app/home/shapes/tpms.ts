import type { ShapeFn } from "./types";
import { cloudShape, mulberry32 } from "./math";

/* ------------------------------------------------------------------ */
/* Triply periodic minimal surfaces (crystal / bone / foam structures)   */
/* ------------------------------------------------------------------ */

type Implicit = (x: number, y: number, z: number) => number;

/** Project random points onto the zero level set with Newton steps. */
function levelSet(f: Implicit, count: number, seed: number, reach: number): Float32Array {
  const rnd = mulberry32(seed);
  const out = new Float32Array(count * 3);
  const h = 1e-3;
  let n = 0;
  let attempts = 0;
  while (n < count && attempts < count * 60) {
    attempts++;
    // random point in a ball (rejection sampling)
    let x = (rnd() * 2 - 1) * reach * 1.15;
    let y = (rnd() * 2 - 1) * reach * 1.15;
    let z = (rnd() * 2 - 1) * reach * 1.15;
    if (x * x + y * y + z * z > (reach * 1.15) ** 2) continue;
    for (let it = 0; it < 7; it++) {
      const v = f(x, y, z);
      const gx = (f(x + h, y, z) - f(x - h, y, z)) / (2 * h);
      const gy = (f(x, y + h, z) - f(x, y - h, z)) / (2 * h);
      const gz = (f(x, y, z + h) - f(x, y, z - h)) / (2 * h);
      const g2 = gx * gx + gy * gy + gz * gz || 1e-9;
      x -= (v * gx) / g2;
      y -= (v * gy) / g2;
      z -= (v * gz) / g2;
    }
    if (Math.abs(f(x, y, z)) > 1e-3 || x * x + y * y + z * z > reach * reach) continue;
    out[n * 3] = x;
    out[n * 3 + 1] = y;
    out[n * 3 + 2] = z;
    n++;
  }
  return out;
}

const tpms = (name: string, f: Implicit, seed: number, scale = 1) =>
  cloudShape(name, (count) => levelSet((x, y, z) => f(x * scale, y * scale, z * scale), count, seed, 5 / scale), {
    spin: 0.25,
    tilt: 0.25,
    radius: 5.1,
    fit: "sphere",
  });

/** Gyroid: the labyrinth found in butterfly wings and block copolymers. */
const gyroid = tpms(
  "gyroid",
  (x, y, z) => Math.sin(x) * Math.cos(y) + Math.sin(y) * Math.cos(z) + Math.sin(z) * Math.cos(x),
  11,
  1.15
);

/** Schwarz P surface: a smooth cubic lattice of tunnels. */
const schwarzP = tpms("schwarzP", (x, y, z) => Math.cos(x) + Math.cos(y) + Math.cos(z), 23, 1.05);

/** Schwarz D (diamond) surface: the geometry of diamond's crystal channels. */
const schwarzD = tpms(
  "schwarzD",
  (x, y, z) =>
    Math.sin(x) * Math.sin(y) * Math.sin(z) +
    Math.sin(x) * Math.cos(y) * Math.cos(z) +
    Math.cos(x) * Math.sin(y) * Math.cos(z) +
    Math.cos(x) * Math.cos(y) * Math.sin(z),
  37,
  1.1
);

/** Neovius surface: a fatter, rounder cousin of Schwarz P. */
const neovius = tpms(
  "neovius",
  (x, y, z) => 3 * (Math.cos(x) + Math.cos(y) + Math.cos(z)) + 4 * Math.cos(x) * Math.cos(y) * Math.cos(z),
  51,
  1.0
);

export const tpmsShapes = { gyroid, schwarzP, schwarzD, neovius } satisfies Record<string, ShapeFn>;
