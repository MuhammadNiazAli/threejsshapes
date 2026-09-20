import type { ShapeFn, Vec3 } from "./types";
import {
  GOLDEN_ANGLE,
  TAU,
  cloudShape,
  fibSphere,
  indexCloud,
  ld1,
  ld2,
  mix,
  polylineToSegments,
  rotX,
  rotY,
  sampleSegments,
} from "./math";

/* ------------------------------------------------------------------ */
/* Natural forms: phyllotaxis, shells, galaxies, DNA, creatures          */
/* ------------------------------------------------------------------ */

/** Sunflower head: 8400 seeds placed at the golden angle, with a ripple running outwards. */
const sunflower: ShapeFn = (c) => {
  const s = (c.idx + 0.5) / c.count;
  const r = 5.6 * Math.sqrt(s);
  const a = c.idx * GOLDEN_ANGLE + c.time * 0.12;
  const y = -1.2 + 2.6 * s + 0.32 * Math.sin(r * 1.8 - c.time * 2.2);
  return rotX([r * Math.cos(a), y, r * Math.sin(a)], 0.55);
};

/** Fibonacci sphere with a slowly travelling standing wave on its surface. */
const fibonacciSphere: ShapeFn = (c) => {
  const [x, y, z] = fibSphere(c.idx, c.count);
  const theta = Math.acos(y);
  const phi = Math.atan2(z, x);
  const r = 4.6 + 0.5 * Math.sin(4 * phi + c.time * 1.2) * Math.sin(3 * theta);
  return [x * r, y * r, z * r];
};

/** Chambered nautilus: a logarithmic spiral swept into a growing tube. */
const nautilus = cloudShape(
  "nautilus",
  (count) => {
    const b = 0.19;
    const thetaMax = 5 * Math.PI;
    const growth = Math.exp(2 * b * thetaMax) - 1;
    return indexCloud(count, (idx, s) => {
      // invert the cumulative surface area so density stays even as the tube grows
      const theta = Math.log(1 + s * growth) / (2 * b);
      const r = 0.3 * Math.exp(b * theta);
      const ang = idx * GOLDEN_ANGLE;
      const rho = 0.42 * r;
      const cx = r * Math.cos(theta);
      const cy = r * Math.sin(theta);
      const radial = Math.cos(ang) * rho;
      return [cx + radial * Math.cos(theta), cy + radial * Math.sin(theta), Math.sin(ang) * rho * 0.85];
    });
  },
  { spin: 0, swing: 0.7, tilt: 0, rock: 0.12 }
);

/** Conch / sea shell: a turbospiral whose opening widens with every whorl. */
const conch = cloudShape(
  "conch",
  (count) =>
    indexCloud(count, (idx, s) => {
      const [, w] = ld2(idx);
      const u = 3 * Math.PI * Math.log(1 + s * (Math.E ** 2 - 1));
      const v = w * TAU;
      const e6 = Math.exp(u / (6 * Math.PI));
      const e3 = Math.exp(u / (3 * Math.PI));
      const c2 = Math.cos(v / 2) ** 2;
      const x = 2 * (1 - e6) * Math.cos(u) * c2;
      const y = 2 * (-1 + e6) * Math.sin(u) * c2;
      const z = 1 - e3 - Math.sin(v) + e6 * Math.sin(v);
      return [x, z, y];
    }),
  { spin: 0.3, tilt: 0.25 }
);

/** Four-armed spiral galaxy with a glowing bulge and differential rotation. */
const spiralArms: ShapeFn = (c) => {
  const idx = c.idx;
  const [a, b] = ld2(idx);
  if (idx % 6 === 0) {
    // central bulge
    const [dx, dy, dz] = fibSphere(idx, c.count);
    const r = 1.6 * Math.cbrt(ld1(idx));
    return rotX(rotY([dx * r, dy * r * 0.7, dz * r], c.time * 0.5), 0.6);
  }
  const arm = idx % 4;
  const s = ((idx >> 2) + 0.5) / (c.count / 4);
  const r = 0.5 + 5.3 * Math.pow(s, 0.75);
  const theta = (arm * Math.PI) / 2 + 2.4 * Math.log(1 + r * 1.1) + (c.time * 1.4) / (1 + r * 0.5);
  const spread = (a - 0.5) * (0.5 + r * 0.16);
  const px = r * Math.cos(theta) + spread * -Math.sin(theta);
  const pz = r * Math.sin(theta) + spread * Math.cos(theta);
  const py = (b - 0.5) * 0.7 * Math.exp(-r * 0.35);
  return rotX([px, py, pz], 0.6);
};

/** DNA double helix with base-pair rungs. */
const dnaLadder: ShapeFn = (c) => {
  const [a, b] = ld2(c.idx);
  const R = 2.2;
  const turns = 2.6;
  const k = c.idx % 8;
  let p: Vec3;
  if (k < 6) {
    const strand = k < 3 ? 0 : 1;
    const y = -5 + 10 * a;
    const th = turns * TAU * a + strand * Math.PI;
    const ang = b * TAU;
    const rr = 0.24;
    p = [
      R * Math.cos(th) + rr * Math.cos(ang) * Math.cos(th),
      y + rr * Math.sin(ang),
      R * Math.sin(th) + rr * Math.cos(ang) * Math.sin(th),
    ];
  } else {
    const rungs = 26;
    const m = Math.floor(a * rungs);
    const s = (m + 0.5) / rungs;
    const y = -5 + 10 * s;
    const th = turns * TAU * s;
    const ax = R * Math.cos(th);
    const az = R * Math.sin(th);
    p = [mix(ax, -ax, b), y + (ld1(c.idx) - 0.5) * 0.12, mix(az, -az, b)];
  }
  return rotY(p, c.time * 0.5);
};

/** Pulsing jellyfish: scalloped bell, long tentacles and frilly oral arms. */
const jellyfish: ShapeFn = (c) => {
  const [a, b] = ld2(c.idx);
  const t = c.time;
  const pulse = Math.sin(t * 2.0);
  const kind = c.idx % 10;
  const rimR = 3.4 * (1 + 0.1 * pulse);
  if (kind < 6) {
    const phi = a * TAU;
    const cosT = 1 - b; // uniform over the hemisphere's area
    const sinT = Math.sqrt(1 - cosT * cosT);
    const scallop = 1 + 0.05 * Math.cos(8 * phi) * (1 - cosT);
    const R = rimR * scallop;
    return [R * sinT * Math.cos(phi), 1.2 + 3.6 * cosT * (1 - 0.1 * pulse), R * sinT * Math.sin(phi)];
  }
  if (kind < 9) {
    const n = 14;
    const k = Math.floor(a * n);
    const phi = (k / n) * TAU;
    const s = b;
    const sway = 0.7 * s * Math.sin(t * 2 - s * 4 + k);
    const sway2 = 0.7 * s * Math.cos(t * 2 - s * 4 + k * 1.3);
    return [rimR * 0.97 * Math.cos(phi) + sway, 1.2 - s * 6.2, rimR * 0.97 * Math.sin(phi) + sway2];
  }
  const arm = Math.floor(a * 4);
  const s = b;
  const ang = s * 7 + t * 1.5 + (arm * TAU) / 4;
  const rr = 0.35 + 0.9 * s;
  return [rr * Math.cos(ang), 2.4 - s * 6.4, rr * Math.sin(ang)];
};

/** Hexagonal ice crystal with feathery dendrite branches. */
const snowflake = cloudShape(
  "snowflake",
  (count) => {
    const segs: number[] = [];
    const add = (p: Vec3, q: Vec3) => segs.push(...p, ...q);
    const dirAt = (angle: number): [number, number] => [Math.cos(angle), Math.sin(angle)];
    for (let arm = 0; arm < 6; arm++) {
      const base = (arm * TAU) / 6;
      const [dx, dy] = dirAt(base);
      add([0, 0, 0], [dx * 5, dy * 5, 0]);
      for (const t of [1.3, 2.4, 3.5]) {
        const len = 1.9 * (1 - t / 6.2);
        for (const side of [-1, 1]) {
          const [bx, by] = dirAt(base + (side * Math.PI) / 3);
          const p: Vec3 = [dx * t, dy * t, 0];
          const q: Vec3 = [p[0] + bx * len, p[1] + by * len, 0];
          add(p, q);
          // little twigs on every branch
          for (const side2 of [-1, 1]) {
            const [tx, ty] = dirAt(base + (side * Math.PI) / 3 + (side2 * Math.PI) / 3);
            const m: Vec3 = [mix(p[0], q[0], 0.6), mix(p[1], q[1], 0.6), 0];
            add(m, [m[0] + tx * len * 0.35, m[1] + ty * len * 0.35, 0]);
          }
        }
      }
      // forked tip
      for (const side of [-1, 1]) {
        const [fx, fy] = dirAt(base + (side * Math.PI) / 4);
        add([dx * 4.2, dy * 4.2, 0], [dx * 4.2 + fx * 0.9, dy * 4.2 + fy * 0.9, 0]);
      }
    }
    const hexagon: Vec3[] = [];
    for (let k = 0; k < 6; k++) hexagon.push([Math.cos((k * TAU) / 6) * 0.9, Math.sin((k * TAU) / 6) * 0.9, 0]);
    segs.push(...polylineToSegments(hexagon, true));
    return sampleSegments(segs, count);
  },
  { spin: 0, swing: 0.7, tilt: 0.25, rock: 0.15, radius: 5.2 }
);

/** Butterfly curve (Temple Fay) with wings that flap in 3D. */
const butterfly: ShapeFn = (() => {
  const base = cloudShape(
    "butterflyBase",
    (count) =>
      indexCloud(count, (_idx, s) => {
        const th = s * 12 * Math.PI;
        const r = Math.exp(Math.cos(th)) - 2 * Math.cos(4 * th) + Math.pow(Math.sin((2 * th - Math.PI) / 24), 5);
        return [Math.sin(th) * r, Math.cos(th) * r, 0];
      }),
    { spin: 0, radius: 5.2 }
  );
  return (c) => {
    const p = base(c);
    const flap = 0.5 + 0.45 * Math.sin(c.time * 3.2);
    return [p[0] * Math.cos(flap), p[1], Math.abs(p[0]) * Math.sin(flap)];
  };
})();

/** Pine cone: overlapping scales laid out on the golden-angle spiral. */
const pineCone = cloudShape(
  "pineCone",
  (count) => {
    const per = 12;
    const M = Math.ceil(count / per);
    return indexCloud(count, (idx) => {
      const m = Math.floor(idx / per);
      const k = idx % per;
      const h = (m + 0.5) / M;
      const ang = m * GOLDEN_ANGLE;
      const R = 3.4 * Math.pow(Math.sin(Math.PI * Math.pow(h, 0.8)), 0.75);
      const arc = k / (per - 1) - 0.5;
      const bulge = 1 - 4 * arc * arc;
      const az = ang + arc * 0.5 * (0.6 + 1 / (1 + 4 * R));
      const rr = R * (1 + 0.16 * bulge);
      return [rr * Math.cos(az), -5 + 10 * h - 0.18 * bulge, rr * Math.sin(az)];
    });
  },
  { spin: 0.3, tilt: 0.15 }
);

export const natureShapes = {
  sunflower,
  fibonacciSphere,
  nautilus,
  conch,
  spiralArms,
  dnaLadder,
  jellyfish,
  snowflake,
  butterfly,
  pineCone,
} satisfies Record<string, ShapeFn>;
