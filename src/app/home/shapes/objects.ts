import type { ShapeFn, Vec3 } from "./types";
import { GOLDEN_ANGLE, TAU, cloudShape, indexCloud, ld1, ld2, ld3, mix, rotY } from "./math";

/* ------------------------------------------------------------------ */
/* Crafted objects: lathe-turned vessels, gems, rockets and more         */
/* ------------------------------------------------------------------ */

type Pt = [number, number];

/** Smooth a control polyline with Catmull-Rom splines. */
function smooth(ctrl: Pt[], perSeg = 24): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)];
    const p1 = ctrl[i];
    const p2 = ctrl[i + 1];
    const p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}

/**
 * Revolve one or more (radius, height) profiles around the Y axis. Particles are
 * distributed by surface area, so density stays even along the whole profile.
 * `sides` turns the round cross-section into a regular polygon (for gems).
 */
function revolve(paths: Pt[][], count: number, opts: { smoothing?: boolean; sides?: number } = {}): Float32Array {
  const pts: Pt[] = [];
  const breaks = new Set<number>();
  for (const path of paths) {
    const dense = opts.smoothing === false ? path : smooth(path);
    breaks.add(pts.length);
    pts.push(...dense);
  }
  const cum: number[] = [0];
  const w: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    if (breaks.has(i)) {
      w.push(0);
      cum.push(cum[i - 1]);
      continue;
    }
    const ds = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const area = ds * (pts[i][0] + pts[i - 1][0]) * 0.5 + ds * 0.02;
    w.push(area);
    cum.push(cum[i - 1] + area);
  }
  const total = cum[cum.length - 1];
  const out = new Float32Array(count * 3);
  let seg = 1;
  for (let idx = 0; idx < count; idx++) {
    const d = ((idx + 0.5) / count) * total;
    while (seg < cum.length - 1 && cum[seg] < d) seg++;
    const span = cum[seg] - cum[seg - 1];
    const t = span > 1e-12 ? (d - cum[seg - 1]) / span : 0;
    const r = mix(pts[seg - 1][0], pts[seg][0], t);
    const y = mix(pts[seg - 1][1], pts[seg][1], t);
    const ang = idx * GOLDEN_ANGLE;
    let rr = r;
    if (opts.sides) {
      const n = opts.sides;
      const sector = TAU / n;
      const local = ((ang % sector) + sector) % sector - sector / 2;
      rr = (r * Math.cos(Math.PI / n)) / Math.cos(local);
    }
    out[idx * 3] = rr * Math.cos(ang);
    out[idx * 3 + 1] = y;
    out[idx * 3 + 2] = rr * Math.sin(ang);
  }
  return out;
}

const lathe = (name: string, paths: Pt[][], opts: { smoothing?: boolean; sides?: number } = {}) =>
  cloudShape(name, (count) => revolve(paths, count, opts), { spin: 0.35, tilt: 0.2 });

/** Ceramic vase with a swelling belly, narrow neck and flared lip. */
const vase = lathe("vase", [
  [
    [0, -5], [1.7, -5], [2.1, -4.6], [2.9, -2.8], [3.4, -0.8], [2.9, 1.4], [1.8, 3.0], [1.5, 3.9], [1.9, 4.7], [2.3, 5],
    [2.1, 5], [1.6, 4.8], [1.3, 4.2],
  ],
]);

/** Wine glass with a thin stem and a tulip-shaped bowl. */
const wineGlass = lathe("wineGlass", [
  [
    [0, -5], [2.6, -5], [2.5, -4.85], [0.9, -4.5], [0.28, -4.0], [0.24, -1.0], [0.7, -0.5], [2.2, 0.6], [3.0, 2.3], [2.9, 4.2], [2.7, 5],
    [2.55, 4.9], [2.65, 3.4], [2.2, 1.8], [1.2, 0.5], [0, 0.2],
  ],
]);

/** Hourglass: two glass bulbs, a hair-thin neck and wooden end plates. */
const hourglass = lathe("hourglass", [
  [
    [0, -5], [3.7, -5], [3.7, -4.7], [2.5, -4.3], [2.9, -2.8], [2.5, -1.4], [0.5, -0.25], [0.22, 0], [0.5, 0.25], [2.5, 1.4], [2.9, 2.8], [2.5, 4.3], [3.7, 4.7], [3.7, 5], [0, 5],
  ],
]);

/** Chess pawn: base, collar and a round head. */
const chessPawn = lathe("chessPawn", [
  [
    [0, -5], [2.7, -5], [2.7, -4.6], [2.1, -4.3], [1.5, -3.6], [0.95, -2.0], [0.8, -0.6], [1.7, -0.3], [1.8, 0], [0.9, 0.3], [0.8, 0.6],
    [1.3, 1.0], [1.7, 1.7], [1.7, 2.5], [1.3, 3.3], [0.7, 3.7], [0, 3.85],
  ],
]);

/** Cast bell with a thick lip and a hanging clapper. */
const bell = lathe("bell", [
  [
    [0, 4.9], [0.55, 4.7], [0.6, 4.2], [1.4, 3.6], [2.4, 2.2], [3.1, 0], [3.6, -2.2], [4.2, -3.6], [4.6, -4.0], [4.2, -3.7],
    [3.5, -2.2], [2.7, 0], [1.7, 2.2], [0.8, 3.6],
  ],
  [
    [0, -1.8], [0.55, -2.2], [0.6, -3.0], [0, -3.4],
  ],
]);

/** Toadstool: domed cap, gills underneath and a tapered stem. */
const mushroom = lathe("mushroom", [
  [
    [0, 4.8], [1.6, 4.5], [3.0, 3.6], [4.0, 2.3], [4.5, 1.0], [4.2, 0.4], [3.0, 0.7], [1.6, 0.8], [0.95, 0.7],
  ],
  [
    [0.9, 0.7], [0.85, -0.6], [1.0, -2.6], [1.5, -4.0], [2.1, -5], [0, -5],
  ],
]);

/** Brilliant-cut diamond: octagonal girdle, table on top and a pointed pavilion. */
const gemDiamond = cloudShape(
  "gemDiamond",
  (count) =>
    revolve(
      [
        [
          [0, 4.0], [2.7, 4.0], [5.0, 1.9], [5.0, 1.5], [0, -4.8],
        ],
      ],
      count,
      { smoothing: false, sides: 8 }
    ),
  { spin: 0.4, tilt: 0.28 }
);

/** Rocket: nose cone, body, three fins and a flickering exhaust flame. */
const rocket: ShapeFn = (() => {
  const body = cloudShape(
    "rocketBody",
    (count) => {
      const paths: Pt[][] = [
        [
          [0, 5], [0.6, 4.1], [1.2, 3.0], [1.6, 1.7], [1.7, 0.4], [1.7, -2.8], [1.55, -3.4], [1.95, -4.1], [1.65, -4.3], [0.9, -3.9], [0, -3.8],
        ],
      ];
      const cloud = revolve(paths, count);
      // three swept fins, drawn as triangular plates
      for (let idx = 0; idx < count; idx++) {
        if (idx % 8 !== 1 && idx % 8 !== 5) continue;
        const fin = Math.floor(idx / 8) % 3;
        const [a, b] = ld2(idx);
        let s = a;
        let t = b;
        if (s + t > 1) {
          s = 1 - s;
          t = 1 - t;
        }
        // triangle in (radius, height): body top, tail, outer tip
        const r = 1.7 * (1 - s - t) + 1.7 * s + 3.7 * t;
        const y = -0.6 * (1 - s - t) + -3.9 * s + -4.2 * t;
        const ang = (fin * TAU) / 3 + (ld1(idx) - 0.5) * 0.05;
        cloud[idx * 3] = r * Math.cos(ang);
        cloud[idx * 3 + 1] = y;
        cloud[idx * 3 + 2] = r * Math.sin(ang);
      }
      return cloud;
    },
    { spin: 0, tilt: 0, radius: 0 }
  );
  return (c) => {
    if (c.idx % 8 === 3) {
      // exhaust flame
      const [a, b] = ld2(c.idx);
      const len = 1.2 + 0.4 * Math.sin(c.time * 22 + c.idx * 0.3);
      const y = -4.3 - a * len;
      const r = 1.1 * (1 - a) * Math.sqrt(b);
      const ang = c.idx * GOLDEN_ANGLE;
      return rotY([r * Math.cos(ang), y, r * Math.sin(ang)], c.time * 0.35);
    }
    const p = body(c);
    return rotY([p[0], p[1], p[2]], c.time * 0.35);
  };
})();

/** Flying saucer: lens-shaped hull, glass dome, rotating lights and a tractor beam. */
const ufo: ShapeFn = (() => {
  const hull = cloudShape(
    "ufoHull",
    (count) =>
      revolve(
        [
          [
            [0, -1.3], [1.8, -1.4], [3.6, -1.1], [5.4, -0.25], [5.9, 0], [5.4, 0.35], [3.2, 0.95], [2.0, 1.3], [1.7, 2.2], [1.2, 3.0], [0, 3.45],
          ],
        ],
        count
      ),
    { spin: 0, radius: 0 }
  );
  return (c) => {
    const kind = c.idx % 10;
    if (kind === 7) {
      const n = 12;
      const k = Math.floor(ld1(c.idx) * n);
      const ang = (k / n) * TAU + c.time * 1.2;
      const jit = ld3(c.idx);
      return [
        4.4 * Math.cos(ang) + (jit[0] - 0.5) * 0.3,
        -0.75 + (jit[1] - 0.5) * 0.3,
        4.4 * Math.sin(ang) + (jit[2] - 0.5) * 0.3,
      ];
    }
    if (kind >= 8) {
      const [a, b] = ld2(c.idx);
      const y = -1.5 - a * 3.4;
      const r = (1.4 + a * 2.2) * Math.sqrt(b);
      const ang = c.idx * GOLDEN_ANGLE + c.time * 0.8;
      return [r * Math.cos(ang), y, r * Math.sin(ang)];
    }
    const p = hull(c);
    return rotY(p, c.time * 0.5);
  };
})();

/** Quartz crystal cluster: hexagonal prisms with pointed tips. */
const crystalCluster = cloudShape(
  "crystalCluster",
  (count) => {
    type Crystal = { dir: Vec3; len: number; rad: number; base: Vec3 };
    const crystals: Crystal[] = [{ dir: [0, 1, 0], len: 9.5, rad: 1.15, base: [0, -5, 0] }];
    for (let k = 0; k < 9; k++) {
      const az = k * GOLDEN_ANGLE * 2;
      const tilt = 0.4 + 0.3 * ((k * 0.37) % 1) + 0.15 * (k % 3);
      crystals.push({
        dir: [Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az)],
        len: 4.5 + 3.5 * ((k * 0.61) % 1),
        rad: 0.65 + 0.35 * ((k * 0.43) % 1),
        base: [Math.cos(az) * 0.9, -5, Math.sin(az) * 0.9],
      });
    }
    const weights = crystals.map((c) => c.len * c.rad);
    const total = weights.reduce((a, b) => a + b, 0);
    return indexCloud(count, (idx) => {
      let pick = ld1(idx) * total;
      let ci = 0;
      while (ci < crystals.length - 1 && pick > weights[ci]) {
        pick -= weights[ci];
        ci++;
      }
      const cr = crystals[ci];
      const [a, b] = ld2(idx);
      // frame around the crystal axis
      const ref: Vec3 = Math.abs(cr.dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      let ux = cr.dir[1] * ref[2] - cr.dir[2] * ref[1];
      let uy = cr.dir[2] * ref[0] - cr.dir[0] * ref[2];
      let uz = cr.dir[0] * ref[1] - cr.dir[1] * ref[0];
      const ul = Math.hypot(ux, uy, uz);
      ux /= ul;
      uy /= ul;
      uz /= ul;
      const vx = cr.dir[1] * uz - cr.dir[2] * uy;
      const vy = cr.dir[2] * ux - cr.dir[0] * uz;
      const vz = cr.dir[0] * uy - cr.dir[1] * ux;
      const h = a * cr.len;
      const tipStart = cr.len * 0.78;
      const shrink = h > tipStart ? 1 - (h - tipStart) / (cr.len - tipStart) : 1;
      const ang = b * TAU;
      const sector = TAU / 6;
      const local = ((ang % sector) + sector) % sector - sector / 2;
      const rr = ((cr.rad * Math.cos(Math.PI / 6)) / Math.cos(local)) * shrink;
      const ca = Math.cos(ang) * rr;
      const sa = Math.sin(ang) * rr;
      return [
        cr.base[0] + cr.dir[0] * h + ux * ca + vx * sa,
        cr.base[1] + cr.dir[1] * h + uy * ca + vy * sa,
        cr.base[2] + cr.dir[2] * h + uz * ca + vz * sa,
      ];
    });
  },
  { spin: 0.3, tilt: 0.1 }
);

export const objectShapes = {
  vase,
  wineGlass,
  hourglass,
  chessPawn,
  bell,
  mushroom,
  gemDiamond,
  rocket,
  ufo,
  crystalCluster,
} satisfies Record<string, ShapeFn>;
