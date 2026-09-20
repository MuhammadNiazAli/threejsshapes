import type { ShapeFn, Vec3 } from "./types";
import { fitCloud, memo, rotY } from "./math";

/* ------------------------------------------------------------------ */
/* Strange attractors: chaotic trajectories with particles flowing along them */
/* ------------------------------------------------------------------ */

type Field = (x: number, y: number, z: number) => Vec3;

/** Integrate an ODE with RK4 and record every `sub`-th step. */
function trace(f: Field, start: Vec3, dt: number, sub: number, count: number, skip = 3000): Float32Array {
  let [x, y, z] = start;
  const step = () => {
    const k1 = f(x, y, z);
    const k2 = f(x + (dt / 2) * k1[0], y + (dt / 2) * k1[1], z + (dt / 2) * k1[2]);
    const k3 = f(x + (dt / 2) * k2[0], y + (dt / 2) * k2[1], z + (dt / 2) * k2[2]);
    const k4 = f(x + dt * k3[0], y + dt * k3[1], z + dt * k3[2]);
    x += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    z += (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
  };
  for (let i = 0; i < skip; i++) step();
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    for (let s = 0; s < sub; s++) step();
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

/**
 * Turn a vector field into a shape. The particles are spaced along one long
 * trajectory and slowly travel down it, so the attractor looks alive.
 */
function attractor(
  name: string,
  f: Field,
  start: Vec3,
  dt: number,
  sub: number,
  opts: { radius?: number; speed?: number; center?: Vec3 } = {}
): ShapeFn {
  const speed = opts.speed ?? 30;
  return (c) => {
    const arr = memo(`attractor:${name}:${c.count}`, () => {
      const cloud = trace(f, start, dt, sub, c.count + 1);
      if (opts.center) {
        for (let i = 0; i < cloud.length; i += 3) {
          cloud[i] -= opts.center[0];
          cloud[i + 1] -= opts.center[1];
          cloud[i + 2] -= opts.center[2];
        }
      }
      return fitCloud(cloud, opts.radius ?? 5.2, 0.01, "box");
    });
    const n = c.count;
    const pos = c.idx + c.time * speed;
    const k0 = Math.floor(pos);
    const t = pos - k0;
    const a = (k0 % n) * 3;
    const b = ((k0 + 1) % n) * 3;
    const p: Vec3 = [
      arr[a] + (arr[b] - arr[a]) * t,
      arr[a + 1] + (arr[b + 1] - arr[a + 1]) * t,
      arr[a + 2] + (arr[b + 2] - arr[a + 2]) * t,
    ];
    return rotY(p, c.time * 0.2);
  };
}

/** Lorenz butterfly (σ=10, ρ=28, β=8/3). */
const lorenz = attractor("lorenz", (x, y, z) => [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z], [0.1, 0, 0], 0.006, 3);

/** Rössler band: a single folded ribbon of chaos. */
const rossler = attractor("rossler", (x, y, z) => [-y - z, x + 0.2 * y, 0.2 + z * (x - 5.7)], [1, 1, 0], 0.02, 4);

/** Wang four-wing attractor: two pairs of wings around a saddle. */
const fourWing = attractor(
  "fourWing",
  (x, y, z) => [0.2 * x + y * z, 0.01 * x - 0.4 * y - x * z, -z - x * y],
  [1, 0, 0.5],
  0.02,
  4
);

/** Thomas' cyclically symmetric attractor. */
const thomas = attractor(
  "thomas",
  (x, y, z) => [Math.sin(y) - 0.208186 * x, Math.sin(z) - 0.208186 * y, Math.sin(x) - 0.208186 * z],
  [0.1, 0, 0],
  0.05,
  5
);

/** Halvorsen attractor: three-fold symmetric swirl. */
const halvorsen = attractor(
  "halvorsen",
  (x, y, z) => [-1.4 * x - 4 * y - 4 * z - y * y, -1.4 * y - 4 * z - 4 * x - z * z, -1.4 * z - 4 * x - 4 * y - x * x],
  [-1.48, -1.51, 2.04],
  0.005,
  5
);

/** Chen–Lee attractor: two interleaved scrolls. */
const chenLee = attractor(
  "chenLee",
  (x, y, z) => [5 * x - y * z, -10 * y + x * z, -0.38 * z + (x * y) / 3],
  [1, 1, 1],
  0.003,
  6
);

/** Dadras attractor: a four-lobed butterfly. */
const dadras = attractor(
  "dadras",
  (x, y, z) => [y - 3 * x + 2.7 * y * z, 1.7 * y - x * z + z, 2 * x * y - 9 * z],
  [1.1, 2.1, -2],
  0.005,
  4
);

/** Burke–Shaw attractor: a twisted double scroll. */
const burkeShaw = attractor(
  "burkeShaw",
  (x, y, z) => [-10 * (x + y), -y - 10 * x * z, 10 * x * y + 4.272],
  [0.6, 0, 0],
  0.005,
  4
);

export const attractorShapes = {
  lorenz,
  rossler,
  fourWing,
  thomas,
  halvorsen,
  chenLee,
  dadras,
  burkeShaw,
} satisfies Record<string, ShapeFn>;
