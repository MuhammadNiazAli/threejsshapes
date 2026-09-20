import type { ShapeFn, Vec3 } from "./types";
import {
  TAU,
  cloudShape,
  fibSphere,
  indexCloud,
  ld3,
  polylineToSegments,
  sampleSegments,
} from "./math";

/* ------------------------------------------------------------------ */
/* Fractals: IFS sponges, space-filling curves, escape-time landscapes  */
/* ------------------------------------------------------------------ */

/** Menger sponge (level 2): a dot lattice over every exposed face of its 400 cubes. */
const mengerSponge = cloudShape(
  "mengerSponge",
  (count) => {
    const filled = (x: number, y: number, z: number): boolean => {
      if (x < 0 || y < 0 || z < 0 || x > 8 || y > 8 || z > 8) return false;
      for (let level = 0; level < 2; level++) {
        const dx = Math.floor(x / 3 ** level) % 3;
        const dy = Math.floor(y / 3 ** level) % 3;
        const dz = Math.floor(z / 3 ** level) % 3;
        const mids = (dx === 1 ? 1 : 0) + (dy === 1 ? 1 : 0) + (dz === 1 ? 1 : 0);
        if (mids >= 2) return false;
      }
      return true;
    };
    // collect exposed faces as [cell, axis, side]
    const faces: [number, number, number, number, number][] = [];
    for (let x = 0; x < 9; x++)
      for (let y = 0; y < 9; y++)
        for (let z = 0; z < 9; z++) {
          if (!filled(x, y, z)) continue;
          const c = [x, y, z];
          for (let axis = 0; axis < 3; axis++)
            for (const side of [-1, 1]) {
              const n = [...c];
              n[axis] += side;
              if (!filled(n[0], n[1], n[2])) faces.push([x, y, z, axis, side]);
            }
        }
    // 8 dots per exposed face (a 3x3 grid without its centre) keep the holes crisp
    const dots: [number, number][] = [];
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 3; b++) if (a !== 1 || b !== 1) dots.push([(a + 0.5) / 3, (b + 0.5) / 3]);
    return indexCloud(count, (idx) => {
      const k = idx % (faces.length * 8);
      const [x, y, z, axis, side] = faces[Math.floor(k / 8)];
      const [da, db] = dots[k % 8];
      const p = [x, y, z];
      p[axis] += side > 0 ? 1 : 0;
      p[(axis + 1) % 3] += da;
      p[(axis + 2) % 3] += db;
      return [p[0] - 4.5, p[1] - 4.5, p[2] - 4.5];
    });
  },
  { spin: 0.25, tilt: 0.4 }
);

/** Sierpinski tetrahedron: a pyramid of pyramids, level 6. */
const sierpinskiTetra = cloudShape(
  "sierpinskiTetra",
  (count) => {
    const V: Vec3[] = [
      [0, 1, 0],
      [Math.sqrt(8 / 9), -1 / 3, 0],
      [-Math.sqrt(2 / 9), -1 / 3, Math.sqrt(2 / 3)],
      [-Math.sqrt(2 / 9), -1 / 3, -Math.sqrt(2 / 3)],
    ];
    return indexCloud(count, (idx) => {
      const k = idx % 4096;
      // random point inside the smallest tetrahedron, then apply the six maps
      const w = ld3(idx);
      const b = [w[0], w[1], w[2]].map((x) => -Math.log(1 - x * 0.999) || 1e-3);
      const b4 = -Math.log(1 - ((idx * 0.7548776662466927) % 1) * 0.999) || 1e-3;
      const sum = b[0] + b[1] + b[2] + b4;
      const bw = [b[0] / sum, b[1] / sum, b[2] / sum, b4 / sum];
      let p: Vec3 = [0, 0, 0];
      for (let i = 0; i < 4; i++) {
        p[0] += V[i][0] * bw[i];
        p[1] += V[i][1] * bw[i];
        p[2] += V[i][2] * bw[i];
      }
      for (let level = 0; level < 6; level++) {
        const d = (k >> (2 * level)) & 3;
        p = [(p[0] + V[d][0]) / 2, (p[1] + V[d][1]) / 2, (p[2] + V[d][2]) / 2];
      }
      return p;
    });
  },
  { spin: 0.3, tilt: 0.15 }
);

/** Koch snowflake, iteration 0 to 4 stacked in layers to show the recursion. */
const kochSnowflake = cloudShape(
  "kochSnowflake",
  (count) => {
    const segsByLevel: number[][] = [];
    let pts: Vec3[] = [0, 1, 2].map((k): Vec3 => [Math.sin((k * TAU) / 3), Math.cos((k * TAU) / 3), 0]);
    for (let level = 0; level <= 4; level++) {
      segsByLevel.push(polylineToSegments(pts, true));
      const next: Vec3[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const dx = (b[0] - a[0]) / 3;
        const dy = (b[1] - a[1]) / 3;
        const p1: Vec3 = [a[0] + dx, a[1] + dy, 0];
        const p3: Vec3 = [a[0] + 2 * dx, a[1] + 2 * dy, 0];
        const c = Math.cos(-Math.PI / 3);
        const s = Math.sin(-Math.PI / 3);
        const p2: Vec3 = [p1[0] + dx * c - dy * s, p1[1] + dx * s + dy * c, 0];
        next.push(a, p1, p2, p3);
      }
      pts = next;
    }
    // each level goes on its own layer; more detailed levels get more particles
    const weights = [1, 1.5, 2.5, 4, 6];
    const total = weights.reduce((x, y) => x + y, 0);
    const out = new Float32Array(count * 3);
    let offset = 0;
    weights.forEach((w, level) => {
      const n = level === 4 ? count - offset : Math.round((w / total) * count);
      const cloud = sampleSegments(segsByLevel[level], n);
      for (let i = 0; i < n; i++) {
        out[(offset + i) * 3] = cloud[i * 3];
        out[(offset + i) * 3 + 1] = cloud[i * 3 + 1];
        out[(offset + i) * 3 + 2] = (level - 2) * 0.55;
      }
      offset += n;
    });
    return out;
  },
  { spin: 0, swing: 0.9, tilt: 0.3, rock: 0.15 }
);

/** Heighway dragon curve: 8192 folds of a strip of paper. */
const dragonCurve = cloudShape(
  "dragonCurve",
  (count) => {
    const N = 8192;
    const pts: Vec3[] = [[0, 0, 0]];
    let x = 0;
    let y = 0;
    let dir = 0;
    const dx = [1, 0, -1, 0];
    const dy = [0, 1, 0, -1];
    x += dx[dir];
    y += dy[dir];
    pts.push([x, y, 0]);
    for (let n = 1; n < N; n++) {
      const left = ((n & -n) << 1) & n;
      dir = (dir + (left ? 1 : 3)) & 3;
      x += dx[dir];
      y += dy[dir];
      pts.push([x, y, 0]);
    }
    return sampleSegments(polylineToSegments(pts), count);
  },
  { spin: 0, swing: 0.7, tilt: 0.25, rock: 0.15, radius: 5.4 }
);

/** Hilbert curve (order 5): a single line that fills a square. */
const hilbertCurve = cloudShape(
  "hilbertCurve",
  (count) => {
    const n = 32;
    const d2xy = (d: number): [number, number] => {
      let x = 0;
      let y = 0;
      let t = d;
      for (let s = 1; s < n; s *= 2) {
        const rx = 1 & (t >> 1);
        const ry = 1 & (t ^ rx);
        if (ry === 0) {
          if (rx === 1) {
            x = s - 1 - x;
            y = s - 1 - y;
          }
          [x, y] = [y, x];
        }
        x += s * rx;
        y += s * ry;
        t >>= 2;
      }
      return [x, y];
    };
    const pts: Vec3[] = [];
    for (let d = 0; d < n * n; d++) {
      const [x, y] = d2xy(d);
      pts.push([x, y, 0]);
    }
    return sampleSegments(polylineToSegments(pts), count);
  },
  { spin: 0, swing: 0.7, tilt: 0.25, rock: 0.15, radius: 5.4 }
);

/** Mandelbulb (power 8): the 3D cousin of the Mandelbrot set, found by ray-marching. */
const mandelbulb = cloudShape(
  "mandelbulb",
  (count) => {
    const power = 8;
    const inside = (x0: number, y0: number, z0: number): boolean => {
      let x = x0;
      let y = y0;
      let z = z0;
      for (let it = 0; it < 9; it++) {
        const r = Math.sqrt(x * x + y * y + z * z);
        if (r > 2) return false;
        const theta = Math.acos(z / (r || 1e-9)) * power;
        const phi = Math.atan2(y, x) * power;
        const rp = Math.pow(r, power);
        x = rp * Math.sin(theta) * Math.cos(phi) + x0;
        y = rp * Math.sin(theta) * Math.sin(phi) + y0;
        z = rp * Math.cos(theta) + z0;
      }
      return true;
    };
    return indexCloud(count, (idx) => {
      const [dx, dy, dz] = fibSphere(idx, count);
      let hi = 1.3;
      let lo = 0.2;
      // march inwards from outside until we first hit the set
      let r = 1.3;
      let hit = false;
      for (; r > 0.2; r -= 0.03) {
        if (inside(dx * r, dy * r, dz * r)) {
          hit = true;
          break;
        }
      }
      if (!hit) return [0, 0, 0];
      hi = r + 0.03;
      lo = r;
      for (let k = 0; k < 6; k++) {
        const mid = (hi + lo) / 2;
        if (inside(dx * mid, dy * mid, dz * mid)) lo = mid;
        else hi = mid;
      }
      const rr = (hi + lo) / 2;
      return [dx * rr, dz * rr, dy * rr];
    });
  },
  { spin: 0.3, tilt: 0.2, radius: 5, fit: "sphere" }
);

/** Recursive 3D tree: every branch splits into three, swaying in the wind. */
const fractalTree: ShapeFn = (() => {
  const base = cloudShape(
    "fractalTree",
    (count) => {
      const segs: number[] = [];
      const grow = (p: Vec3, dir: Vec3, len: number, depth: number, seed: number) => {
        const q: Vec3 = [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
        segs.push(...p, ...q);
        if (depth === 0) return;
        // build an orthonormal frame around dir
        const ref: Vec3 = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
        let ux = dir[1] * ref[2] - dir[2] * ref[1];
        let uy = dir[2] * ref[0] - dir[0] * ref[2];
        let uz = dir[0] * ref[1] - dir[1] * ref[0];
        const ul = Math.hypot(ux, uy, uz) || 1;
        ux /= ul;
        uy /= ul;
        uz /= ul;
        const vx = dir[1] * uz - dir[2] * uy;
        const vy = dir[2] * ux - dir[0] * uz;
        const vz = dir[0] * uy - dir[1] * ux;
        for (let k = 0; k < 3; k++) {
          const az = (k * TAU) / 3 + seed * 1.7;
          const tilt = 0.5 + 0.08 * Math.sin(seed * 3 + k);
          const ca = Math.cos(az);
          const sa = Math.sin(az);
          const nd: Vec3 = [
            dir[0] * Math.cos(tilt) + (ux * ca + vx * sa) * Math.sin(tilt),
            dir[1] * Math.cos(tilt) + (uy * ca + vy * sa) * Math.sin(tilt),
            dir[2] * Math.cos(tilt) + (uz * ca + vz * sa) * Math.sin(tilt),
          ];
          // a little upward bias so the canopy doesn't droop
          nd[1] += 0.12;
          const nl = Math.hypot(nd[0], nd[1], nd[2]);
          grow(q, [nd[0] / nl, nd[1] / nl, nd[2] / nl], len * 0.72, depth - 1, seed + k + 1);
        }
      };
      grow([0, 0, 0], [0, 1, 0], 3, 6, 1);
      return sampleSegments(segs, count);
    },
    { spin: 0.2, radius: 5.2 }
  );
  return (c) => {
    const p = base(c);
    const k = ((p[1] + 5.2) / 10.4) ** 2;
    return [p[0] + Math.sin(c.time * 1.3 + p[1] * 0.4) * 0.35 * k, p[1], p[2] + Math.cos(c.time * 1.1 + p[1] * 0.3) * 0.25 * k];
  };
})();

/** Barnsley fern: four affine maps generate a photorealistic frond. */
const barnsleyFern: ShapeFn = (() => {
  const base = cloudShape(
    "barnsleyFern",
    (count) => {
      const out = new Float32Array(count * 3);
      let x = 0;
      let y = 0;
      // deterministic pseudo-random selection of the four maps
      let seed = 12345;
      const rnd = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let i = -50; i < count; i++) {
        const r = rnd();
        let nx: number;
        let ny: number;
        if (r < 0.01) {
          nx = 0;
          ny = 0.16 * y;
        } else if (r < 0.86) {
          nx = 0.85 * x + 0.04 * y;
          ny = -0.04 * x + 0.85 * y + 1.6;
        } else if (r < 0.93) {
          nx = 0.2 * x - 0.26 * y;
          ny = 0.23 * x + 0.22 * y + 1.6;
        } else {
          nx = -0.15 * x + 0.28 * y;
          ny = 0.26 * x + 0.24 * y + 0.44;
        }
        x = nx;
        y = ny;
        if (i >= 0) {
          out[i * 3] = x;
          out[i * 3 + 1] = y;
          out[i * 3 + 2] = 0.35 * Math.sin(1.3 * x + 0.5 * y) + (rnd() - 0.5) * 0.3;
        }
      }
      return out;
    },
    { spin: 0.25, radius: 5.2 }
  );
  return (c) => {
    const p = base(c);
    const k = ((p[1] + 5.2) / 10.4) ** 2;
    return [p[0] + Math.sin(c.time * 1.5 + p[1] * 0.5) * 0.3 * k, p[1], p[2]];
  };
})();

/** Mandelbrot set as a 3D landscape (height = smooth escape time). */
const mandelbrotTerrain = cloudShape(
  "mandelbrotTerrain",
  (count, sx, sy) => {
    const out = new Float32Array(count * 3);
    for (let idx = 0; idx < count; idx++) {
      const u = Math.floor(idx / sy) / sx;
      const v = (idx % sy) / sy;
      const cx = -0.65 + (u - 0.5) * 3.2;
      const cy = (v - 0.5) * 2.6;
      let zx = 0;
      let zy = 0;
      let it = 0;
      const max = 80;
      while (it < max && zx * zx + zy * zy < 256) {
        const t = zx * zx - zy * zy + cx;
        zy = 2 * zx * zy + cy;
        zx = t;
        it++;
      }
      let h = 0;
      if (it < max) {
        const nu = it + 1 - Math.log2(Math.log(zx * zx + zy * zy) / 2);
        h = Math.pow(nu / max, 0.35);
      }
      out[idx * 3] = (u - 0.5) * 14;
      out[idx * 3 + 1] = -3 + h * 7;
      out[idx * 3 + 2] = (v - 0.5) * 11.4;
    }
    return out;
  },
  { spin: 0.12, radius: 0 }
);

/** Julia set landscape whose parameter c orbits, so the fractal continuously morphs. */
const juliaMorph: ShapeFn = (c) => {
  const a = c.time * 0.3;
  const cr = 0.7885 * Math.cos(a);
  const ci = 0.7885 * Math.sin(a);
  let zx = (c.u - 0.5) * 3.4;
  let zy = (c.v - 0.5) * 2.6;
  let it = 0;
  const max = 28;
  while (it < max && zx * zx + zy * zy < 64) {
    const t = zx * zx - zy * zy + cr;
    zy = 2 * zx * zy + ci;
    zx = t;
    it++;
  }
  let h = 0;
  if (it < max) {
    const nu = it + 1 - Math.log2(Math.log(zx * zx + zy * zy) / 2);
    h = Math.pow(Math.max(0, nu) / max, 0.6);
  }
  return [(c.u - 0.5) * 14, -3.6 + h * 8.5, (c.v - 0.5) * 11];
};

export const fractalShapes = {
  mengerSponge,
  sierpinskiTetra,
  kochSnowflake,
  dragonCurve,
  hilbertCurve,
  mandelbulb,
  fractalTree,
  barnsleyFern,
  mandelbrotTerrain,
  juliaMorph,
} satisfies Record<string, ShapeFn>;
