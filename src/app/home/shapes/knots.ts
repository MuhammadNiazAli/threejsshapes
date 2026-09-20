import type { ShapeFn, Vec3 } from "./types";
import { TAU, cloudShape, tubeCloud, tubeShape } from "./math";

/* ------------------------------------------------------------------ */
/* Knots, links and space curves rendered as glowing tubes             */
/* ------------------------------------------------------------------ */

/** The simplest non-trivial knot: the (2,3) torus knot. */
const trefoilKnot = tubeShape(
  "trefoilKnot",
  (t) => {
    const s = t * TAU;
    return [Math.sin(s) + 2 * Math.sin(2 * s), Math.cos(s) - 2 * Math.cos(2 * s), -Math.sin(3 * s)];
  },
  0.4
);

/** A dense (3,8) torus knot winding around a donut-shaped path. */
const torusKnot = tubeShape(
  "torusKnot",
  (t) => {
    const s = t * TAU;
    const r = Math.cos(8 * s) * 1.2 + 2.6;
    return [r * Math.cos(3 * s), -Math.sin(8 * s) * 1.2, r * Math.sin(3 * s)];
  },
  0.2
);

/** Figure-eight knot (4₁), the simplest hyperbolic knot. */
const figureEightKnot = tubeShape(
  "figureEightKnot",
  (t) => {
    const s = t * TAU;
    return [(2 + Math.cos(2 * s)) * Math.cos(3 * s), (2 + Math.cos(2 * s)) * Math.sin(3 * s), Math.sin(4 * s)];
  },
  0.36
);

/** A 3D Lissajous knot (frequencies 3, 2, 7). */
const lissajousKnot = tubeShape(
  "lissajousKnot",
  (t) => {
    const s = t * TAU;
    return [3 * Math.cos(3 * s + 0.7), 3 * Math.cos(2 * s + 0.2), 3 * Math.cos(7 * s)];
  },
  0.2
);

/** A wire coil wound around a torus: think inductor or tokamak magnet. */
const toroidalCoil = tubeShape(
  "toroidalCoil",
  (t) => {
    const s = t * TAU;
    const phi = 22 * s;
    const R = 3;
    const r = 1.3;
    return [(R + r * Math.cos(phi)) * Math.cos(s), r * Math.sin(phi), (R + r * Math.cos(phi)) * Math.sin(s)];
  },
  0.16
);

/** A spiral drawn on a sphere from pole to pole. */
const sphericalSpiral = tubeShape(
  "sphericalSpiral",
  (t) => {
    const theta = Math.PI * t;
    const phi = TAU * 10 * t;
    return [5 * Math.sin(theta) * Math.cos(phi), 5 * Math.cos(theta), 5 * Math.sin(theta) * Math.sin(phi)];
  },
  0.1
);

/** A 3D hypotrochoid ("spirograph") lifted into a wavy ribbon. */
const spirograph = tubeShape(
  "spirograph",
  (t) => {
    const s = t * 6 * Math.PI;
    const R = 5;
    const r = 3;
    const d = 5;
    const k = (R - r) / r;
    return [(R - r) * Math.cos(s) + d * Math.cos(k * s), 2.6 * Math.sin((5 / 3) * s), (R - r) * Math.sin(s) - d * Math.sin(k * s)];
  },
  0.2
);

/** Borromean rings: three loops that are linked, yet fall apart if any one is removed. */
const borromeanRings: ShapeFn = cloudShape(
  "borromeanRings",
  (count) => {
    const a = 4.4;
    const b = 2.2;
    const rings: ((t: number) => Vec3)[] = [
      (t) => [a * Math.cos(t * TAU), b * Math.sin(t * TAU), 0],
      (t) => [0, a * Math.cos(t * TAU), b * Math.sin(t * TAU)],
      (t) => [b * Math.sin(t * TAU), 0, a * Math.cos(t * TAU)],
    ];
    const clouds = rings.map((ring) => tubeCloud(count, ring, 0.2));
    const out = new Float32Array(count * 3);
    for (let idx = 0; idx < count; idx++) {
      const src = clouds[idx % 3];
      out[idx * 3] = src[idx * 3];
      out[idx * 3 + 1] = src[idx * 3 + 1];
      out[idx * 3 + 2] = src[idx * 3 + 2];
    }
    return out;
  },
  { spin: 0.3, tilt: 0.25 }
);

export const knotShapes = {
  trefoilKnot,
  torusKnot,
  figureEightKnot,
  lissajousKnot,
  toroidalCoil,
  sphericalSpiral,
  spirograph,
  borromeanRings,
} satisfies Record<string, ShapeFn>;
