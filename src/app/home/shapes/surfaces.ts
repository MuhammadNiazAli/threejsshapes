import type { ShapeFn, Vec3 } from "./types";
import { TAU, cloudShape, fibSphere, indexCloud, surfaceShape } from "./math";

/* ------------------------------------------------------------------ */
/* Classic mathematical surfaces (minimal, pseudospherical, non-orientable) */
/* ------------------------------------------------------------------ */

/** Minimal surface of revolution: the shape a soap film makes between two rings. */
const catenoid = surfaceShape("catenoid", (u, v) => {
  const a = 2.3;
  const w = (v - 0.5) * 2 * 3.3;
  const r = a * Math.cosh(w / a);
  const t = u * TAU;
  return [r * Math.cos(t), w * 1.4, r * Math.sin(t)];
});

/** Double helicoid: a ruled screw surface, the catenoid's "twin". */
const helicoid = surfaceShape("helicoid", (u, v) => {
  const t = u * 4 * Math.PI;
  const rho = (v - 0.5) * 2 * 4.6;
  return [rho * Math.cos(t), (t / (4 * Math.PI) - 0.5) * 9.2, rho * Math.sin(t)];
});

/** Enneper's self-intersecting minimal surface. */
const enneper = surfaceShape("enneper", (u, v) => {
  const a = (u - 0.5) * 3.0;
  const b = (v - 0.5) * 3.0;
  const x = a - (a * a * a) / 3 + a * b * b;
  const z = b - (b * b * b) / 3 + b * a * a;
  const h = a * a - b * b;
  return [x, h * 1.8, z];
});

/** Dini's surface: a pseudosphere twisted into a corkscrew. */
const dini = surfaceShape("dini", (u, v) => {
  const t = u * 4 * Math.PI;
  const s = 0.08 + v * 1.92;
  const x = Math.cos(t) * Math.sin(s);
  const z = Math.sin(t) * Math.sin(s);
  const h = Math.cos(s) + Math.log(Math.tan(s / 2)) + 0.2 * t;
  return [x * 2.4, h * 2, z * 2.4];
});

/** Double pseudosphere (tractricoid): two infinite horns glued at a sharp rim. */
const pseudosphere = surfaceShape("pseudosphere", (u, v) => {
  const w = (u - 0.5) * 5.2;
  const t = v * TAU;
  const r = 1 / Math.cosh(w);
  return [3 * r * Math.cos(t), 3 * (w - Math.tanh(w)), 3 * r * Math.sin(t)];
});

/** Rotate so the (1,1,1) diagonal points up: shows the surface's 3-fold symmetry. */
const alignDiagonalToY = (p: Vec3): Vec3 => {
  const kx = -Math.SQRT1_2;
  const kz = Math.SQRT1_2;
  const cos = 1 / Math.sqrt(3);
  const sin = Math.sqrt(2 / 3);
  const dot = kx * p[0] + kz * p[2];
  const cx = -kz * p[1]; // k × p, y component of k is 0
  const cy = kz * p[0] - kx * p[2];
  const cz = kx * p[1];
  return [
    p[0] * cos + cx * sin + kx * dot * (1 - cos),
    p[1] * cos + cy * sin,
    p[2] * cos + cz * sin + kz * dot * (1 - cos),
  ];
};

/** Steiner's Roman surface: image of the sphere under (x,y,z) -> (yz, zx, xy). */
const romanSurface = cloudShape("romanSurface", (count) =>
  indexCloud(count, (idx) => {
    const [a, b, c] = fibSphere(idx, count);
    return alignDiagonalToY([b * c, a * b, c * a]);
  })
);

/** Cross-cap: image of the sphere under (x,y,z) -> (xz, yz, x² - y²). */
const crossCap = cloudShape("crossCap", (count) =>
  indexCloud(count, (idx) => {
    const [a, b, c] = fibSphere(idx, count);
    return [a * c, a * a - b * b, b * c];
  })
);

/** Boy's surface (Bryant–Kusner parametrisation): an immersed projective plane. */
type Cx = [number, number];
const cmul = (a: Cx, b: Cx): Cx => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a: Cx, b: Cx): Cx => {
  const d = b[0] * b[0] + b[1] * b[1] || 1e-12;
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const boySurface = cloudShape("boySurface", (count) =>
  indexCloud(count, (idx, s) => {
    const r = Math.sqrt(s) * 0.985;
    const t = ((idx * 0.7548776662466927 + 0.5) % 1) * TAU;
    const w: Cx = [r * Math.cos(t), r * Math.sin(t)];
    const w2 = cmul(w, w);
    const w3 = cmul(w2, w);
    const w4 = cmul(w3, w);
    const w6 = cmul(w3, w3);
    const den: Cx = [w6[0] + Math.sqrt(5) * w3[0] - 1, w6[1] + Math.sqrt(5) * w3[1]];
    const a = cdiv(cmul(w, [1 - w4[0], -w4[1]]), den);
    const b = cdiv(cmul(w, [1 + w4[0], w4[1]]), den);
    const c = cdiv([1 + w6[0], w6[1]], den);
    const g1 = -1.5 * a[1];
    const g2 = -1.5 * b[0];
    const g3 = c[1] - 0.5;
    const n = g1 * g1 + g2 * g2 + g3 * g3 || 1e-9;
    return [g1 / n, g3 / n, g2 / n];
  })
);

/** Scherk's first surface: z = ln(cos y / cos x), a saddle tower with four spikes. */
const scherkSurface = surfaceShape("scherkSurface", (u, v) => {
  const a = (u - 0.5) * 2 * 1.42;
  const b = (v - 0.5) * 2 * 1.42;
  return [a, Math.log(Math.cos(b) / Math.cos(a)), b];
});

/** Gielis superformula r(a) used by the two supershapes below. */
const superformula = (m: number, n1: number, n2: number, n3: number, a: number): number =>
  Math.pow(
    Math.pow(Math.abs(Math.cos((m * a) / 4)), n2) + Math.pow(Math.abs(Math.sin((m * a) / 4)), n3),
    -1 / n1
  );

const supershape = (name: string, p1: number[], p2: number[]) =>
  surfaceShape(name, (u, v) => {
    const th = (u - 0.5) * TAU;
    const ph = (v - 0.5) * Math.PI;
    const r1 = superformula(p1[0], p1[1], p1[2], p1[3], th);
    const r2 = superformula(p2[0], p2[1], p2[2], p2[3], ph);
    return [r1 * Math.cos(th) * r2 * Math.cos(ph), r2 * Math.sin(ph), r1 * Math.sin(th) * r2 * Math.cos(ph)];
  });

/** 3D superformula: a seven-fold ornamental urchin. */
const superformulaUrchin = supershape("superformulaUrchin", [7, 0.2, 1.7, 1.7], [7, 0.2, 1.7, 1.7]);

/** 3D superformula: a razor-sharp crystalline star. */
const superformulaStar = supershape("superformulaStar", [5, 0.5, 0.5, 0.5], [3, 0.5, 0.5, 0.5]);

/** Klein bottle in its classic "bottle" immersion. */
const kleinBottle = surfaceShape(
  "kleinBottle",
  (u, v) => {
    const a = u * TAU;
    const b = v * TAU;
    const k = 4 * (1 - Math.cos(a) / 2);
    let x: number;
    let y: number;
    if (a < Math.PI) {
      x = 6 * Math.cos(a) * (1 + Math.sin(a)) + k * Math.cos(a) * Math.cos(b);
      y = 16 * Math.sin(a) + k * Math.sin(a) * Math.cos(b);
    } else {
      x = 6 * Math.cos(a) * (1 + Math.sin(a)) + k * Math.cos(b + Math.PI);
      y = 16 * Math.sin(a);
    }
    const z = k * Math.sin(b);
    return [x, y, z];
  }
);

export const surfaceShapes = {
  catenoid,
  helicoid,
  enneper,
  dini,
  pseudosphere,
  romanSurface,
  crossCap,
  boySurface,
  scherkSurface,
  kleinBottle,
  superformulaUrchin,
  superformulaStar,
} satisfies Record<string, ShapeFn>;
