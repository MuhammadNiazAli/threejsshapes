import type { ShapeFn, Vec3 } from "./types";
import { GOLDEN_ANGLE, TAU, cloudShape, fibSphere, indexCloud, ld1, ld2, ld3, rotX, rotY, rotZ } from "./math";

/* ------------------------------------------------------------------ */
/* Science & space: atoms, planets, black holes, orbitals, fields        */
/* ------------------------------------------------------------------ */

/** Bohr-style atom: dense nucleus, three tilted electron orbits and orbiting electrons. */
const atomModel: ShapeFn = (c) => {
  const k = c.idx % 20;
  const jit = ld3(c.idx);
  if (k < 3) {
    const [dx, dy, dz] = fibSphere(c.idx, c.count);
    const r = 0.95 * Math.cbrt(ld1(c.idx)) * (1 + 0.06 * Math.sin(c.time * 6 + c.idx));
    return [dx * r, dy * r, dz * r];
  }
  const orbit = (e: number, angle: number, thick: number): Vec3 => {
    const p0: Vec3 = [
      5.1 * Math.cos(angle) + (jit[0] - 0.5) * thick,
      3.3 * Math.sin(angle) + (jit[1] - 0.5) * thick,
      (jit[2] - 0.5) * thick,
    ];
    return rotY(rotZ(p0, 0.75), (e * TAU) / 3 + c.time * 0.35);
  };
  if (k === 3) {
    const e = Math.floor(ld1(c.idx) * 3);
    return orbit(e, c.time * (1.4 + 0.35 * e) + e * 2.1, 0.55);
  }
  return orbit(k % 3, ld2(c.idx)[0] * TAU, 0.1);
};

/** Ringed gas giant: a smooth planet with Keplerian rings that have a Cassini gap. */
const saturn: ShapeFn = (c) => {
  const k = c.idx % 10;
  if (k < 4) {
    const [x, y, z] = fibSphere(c.idx, c.count);
    return rotZ([x * 2.6, y * 2.6, z * 2.6], 0.42);
  }
  const [a, b, t] = ld3(c.idx);
  let r = 3.5 + 2.7 * a;
  if (r > 4.75 && r < 4.95) r += 0.3;
  const ang = b * TAU + (c.time * 2.4) / Math.pow(r, 1.5);
  const p: Vec3 = [r * Math.cos(ang), (t - 0.5) * 0.06, r * Math.sin(ang)];
  return rotX(rotZ(p, 0.42), 0.2);
};

/** Black hole: accretion disc, gravitationally lensed halo and twin polar jets. */
const blackHole: ShapeFn = (c) => {
  const k = c.idx % 20;
  const [a, b, t] = ld3(c.idx);
  if (k < 14) {
    const r = 2.1 + 4.5 * Math.pow(a, 1.4);
    const ang = b * TAU + (c.time * 3.2) / Math.pow(r, 1.5);
    return rotX([r * Math.cos(ang), (t - 0.5) * 0.14 * (r / 3), r * Math.sin(ang)], 0.28);
  }
  if (k < 18) {
    const rho = 2.05 + 0.5 * a * a;
    const ang = b * TAU;
    return [rho * Math.cos(ang), rho * Math.sin(ang), 0];
  }
  const sign = b < 0.5 ? 1 : -1;
  const s = a;
  const r = (0.12 + 0.4 * s) * Math.sqrt(t);
  const ang = c.idx * GOLDEN_ANGLE + s * 5 + c.time * 2;
  return [r * Math.cos(ang), sign * (1.6 + 3.6 * s), r * Math.sin(ang)];
};

/** Builds an atomic-orbital lobe surface r = |Y(θ, φ)| from a Fibonacci sphere. */
const orbital = (name: string, amp: (x: number, y: number, z: number) => number) =>
  cloudShape(
    name,
    (count) =>
      indexCloud(count, (idx) => {
        const [x, y, z] = fibSphere(idx, count);
        const r = Math.abs(amp(x, y, z));
        return [x * r, y * r, z * r];
      }),
    { spin: 0.35, tilt: 0.25, radius: 5, fit: "sphere" }
  );

/** p orbital: two touching lobes with a nodal plane between them. */
const pOrbital = orbital("pOrbital", (_x, y) => y);

/** d(z²) orbital: two polar lobes ringed by a toroidal belt. */
const dOrbital = orbital("dOrbital", (_x, y) => (3 * y * y - 1) / 2);

/** f(xyz) orbital: eight lobes pointing at the corners of a cube. */
const fOrbital = orbital("fOrbital", (x, y, z) => x * y * z);

/** A quantum blob: a superposition of spherical harmonics whose weights drift over time. */
const harmonicBlob: ShapeFn = (c) => {
  const [x, y, z] = fibSphere(c.idx, c.count);
  const cs = y;
  const s = Math.sqrt(Math.max(0, 1 - y * y));
  const phi = Math.atan2(z, x);
  const t = c.time;
  const w = (f: number, p: number) => Math.sin(t * f + p);
  const sum =
    w(0.7, 0) * ((3 * cs * cs - 1) / 2) +
    w(0.9, 1) * s * s * Math.cos(2 * phi) +
    w(0.6, 2) * ((cs * (5 * cs * cs - 3)) / 2) +
    w(0.8, 3) * s * s * s * Math.cos(3 * phi) +
    w(0.5, 4) * ((35 * cs ** 4 - 30 * cs * cs + 3) / 8) +
    w(1.0, 5) * s ** 4 * Math.cos(4 * phi);
  const r = 3.9 + 0.5 * sum;
  return [x * r, y * r, z * r];
};

/** Comet: bright nucleus, coma, a straight ion tail and a curved dust tail. */
const comet: ShapeFn = (c) => {
  const [a, b, t] = ld3(c.idx);
  const k = c.idx % 20;
  const hx = 4.2 + 0.4 * Math.sin(c.time * 0.5);
  const hy = 2.6 + 0.3 * Math.cos(c.time * 0.4);
  if (k < 2) {
    const [dx, dy, dz] = fibSphere(c.idx, c.count);
    const r = 0.7 * Math.cbrt(t);
    return [hx + dx * r, hy + dy * r, dz * r];
  }
  if (k < 4) {
    const [dx, dy, dz] = fibSphere(c.idx * 3 + 1, c.count * 3);
    const r = 0.7 + 1.3 * a * a;
    return [hx + dx * r, hy + dy * r, dz * r];
  }
  const s = Math.pow(a, 1.25);
  const wobble = 0.12 * Math.sin(c.time * 3 + s * 12 + c.idx * 0.01);
  const ang = b * TAU * 7;
  if (k < 12) {
    // ion tail: straight and narrow
    const spread = (0.12 + 0.8 * s) * Math.sqrt(t);
    return [hx - s * 11.5, hy - s * 4.2 + spread * Math.cos(ang) + wobble, spread * Math.sin(ang)];
  }
  // dust tail: broader and curved downwards
  const spread = (0.25 + 1.6 * s) * Math.sqrt(t);
  return [hx - s * 10, hy - s * 2.4 - 3.4 * s * s + spread * Math.cos(ang) + wobble, spread * Math.sin(ang)];
};

/** Dipole magnetic field lines r = L·sin²θ around a small bar magnet. */
const magneticDipole: ShapeFn = (c) => {
  const [a, b, t] = ld3(c.idx);
  const shells = [1.5, 2.3, 3.2, 4.2, 5.3];
  if (c.idx % 20 === 0) {
    // the magnet itself: a small capsule along the axis
    const ang = b * TAU;
    return rotY([0.55 * Math.cos(ang), (a - 0.5) * 2.6 * 1.5, 0.55 * Math.sin(ang)], c.time * 0.35);
  }
  const lines = 60;
  const m = c.idx % lines;
  const L = shells[Math.floor(m / 12)];
  const az = ((m % 12) / 12) * TAU;
  const theta = Math.PI * (0.09 + 0.82 * ((Math.floor(c.idx / lines) + 0.5 + t * 0.001) / (c.count / lines)));
  const r = L * Math.sin(theta) ** 2;
  const p: Vec3 = [r * Math.sin(theta) * Math.cos(az), r * Math.cos(theta) * 1.5, r * Math.sin(theta) * Math.sin(az)];
  return rotY(p, c.time * 0.35);
};

export const scienceShapes = {
  atomModel,
  saturn,
  blackHole,
  pOrbital,
  dOrbital,
  fOrbital,
  harmonicBlob,
  comet,
  magneticDipole,
} satisfies Record<string, ShapeFn>;
