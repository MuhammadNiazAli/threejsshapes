import type { ShapeFn, Vec3 } from "./types";
import { TAU, GOLDEN_ANGLE, ld3, memo } from "./math";

/* ------------------------------------------------------------------ */
/* Four-dimensional objects, rotated in 4D and projected into 3D        */
/* ------------------------------------------------------------------ */

type Vec4 = [number, number, number, number];

/** Rotate a 4D point in the XW, YZ and ZW planes. */
function rotate4(p: Vec4, a: number, b: number, c: number): Vec4 {
  let [x, y, z, w] = p;
  let ca = Math.cos(a);
  let sa = Math.sin(a);
  [x, w] = [x * ca - w * sa, x * sa + w * ca];
  ca = Math.cos(b);
  sa = Math.sin(b);
  [y, z] = [y * ca - z * sa, y * sa + z * ca];
  ca = Math.cos(c);
  sa = Math.sin(c);
  [z, w] = [z * ca - w * sa, z * sa + w * ca];
  return [x, y, z, w];
}

/** Perspective projection from 4D: closer to the viewer in W looks bigger. */
function project4(p: Vec4, dist: number, scale: number): Vec3 {
  const s = (dist / (dist - p[3])) * scale;
  return [p[0] * s, p[1] * s, p[2] * s];
}

const get4 = (arr: Float32Array, idx: number): Vec4 => {
  const k = (idx % (arr.length / 4)) * 4;
  return [arr[k], arr[k + 1], arr[k + 2], arr[k + 3]];
};

/** Points spread evenly over the edges of a polytope (all edges equal length). */
function edgeCloud4(verts: number[][], count: number): Float32Array {
  let min = Infinity;
  for (let a = 0; a < verts.length; a++)
    for (let b = a + 1; b < verts.length; b++) {
      let d = 0;
      for (let k = 0; k < 4; k++) d += (verts[a][k] - verts[b][k]) ** 2;
      min = Math.min(min, d);
    }
  const edges: [number, number][] = [];
  for (let a = 0; a < verts.length; a++)
    for (let b = a + 1; b < verts.length; b++) {
      let d = 0;
      for (let k = 0; k < 4; k++) d += (verts[a][k] - verts[b][k]) ** 2;
      if (Math.abs(d - min) < 1e-6) edges.push([a, b]);
    }
  const out = new Float32Array(count * 4);
  const per = Math.ceil(count / edges.length);
  for (let idx = 0; idx < count; idx++) {
    const [a, b] = edges[idx % edges.length];
    const t = (Math.floor(idx / edges.length) + 0.5) / per;
    for (let k = 0; k < 4; k++) out[idx * 4 + k] = verts[a][k] + (verts[b][k] - verts[a][k]) * t;
  }
  return out;
}

/** Build a ShapeFn from a 4D cloud plus a time-dependent rotation and projection. */
function shape4(
  name: string,
  build: (count: number, segX: number, segY: number) => Float32Array,
  opts: { dist: number; scale: number; rate?: [number, number, number] }
): ShapeFn {
  const [ra, rb, rc] = opts.rate ?? [0.35, 0.22, 0.13];
  return (c) => {
    const arr = memo(`${name}:${c.count}:${c.segX}`, () => build(c.count, c.segX, c.segY));
    const p = rotate4(get4(arr, c.idx), c.time * ra, c.time * rb, c.time * rc);
    return project4(p, opts.dist, opts.scale);
  };
}

/** Tesseract (8-cell): the 4D cube, 16 vertices and 32 edges. */
const tesseract = shape4(
  "tesseract",
  (count) => {
    const v: number[][] = [];
    for (let m = 0; m < 16; m++) v.push([0, 1, 2, 3].map((k) => (m & (1 << k) ? -1 : 1)));
    return edgeCloud4(v, count);
  },
  { dist: 3.6, scale: 2.3 }
);

/** 24-cell: a self-dual 4D polytope with 24 octahedral cells and no 3D analogue. */
const cell24 = shape4(
  "cell24",
  (count) => {
    const v: number[][] = [];
    for (let a = 0; a < 4; a++)
      for (let b = a + 1; b < 4; b++)
        for (const sa of [-1, 1])
          for (const sb of [-1, 1]) {
            const p = [0, 0, 0, 0];
            p[a] = sa;
            p[b] = sb;
            v.push(p);
          }
    return edgeCloud4(v, count);
  },
  { dist: 3.4, scale: 3.4 }
);

/** Clifford torus: the flat torus sitting inside the 4D unit sphere. */
const cliffordTorus = shape4(
  "cliffordTorus",
  (count, sx, sy) => {
    const out = new Float32Array(count * 4);
    for (let idx = 0; idx < count; idx++) {
      const a = (Math.floor(idx / sy) / sx) * TAU;
      const b = ((idx % sy) / sy) * TAU;
      const k = Math.SQRT1_2;
      out.set([Math.cos(a) * k, Math.sin(a) * k, Math.cos(b) * k, Math.sin(b) * k], idx * 4);
    }
    return out;
  },
  { dist: 1.8, scale: 4.2, rate: [0.3, 0.2, 0.0] }
);

/** Hopf fibration: every fibre is a circle, and the fibres are all linked. */
const hopfFibration = shape4(
  "hopfFibration",
  (count) => {
    const fibres = 40;
    const per = Math.ceil(count / fibres);
    const out = new Float32Array(count * 4);
    for (let idx = 0; idx < count; idx++) {
      const f = idx % fibres;
      const m = Math.floor(idx / fibres);
      // base point on the 2-sphere (Fibonacci spiral) and position along the fibre
      const theta = Math.acos(1 - (2 * (f + 0.5)) / fibres);
      const phi = f * GOLDEN_ANGLE;
      const psi = ((m + 0.5) / per) * TAU;
      const c = Math.cos(theta / 2);
      const s = Math.sin(theta / 2);
      out.set([c * Math.cos(psi), c * Math.sin(psi), s * Math.cos(psi + phi), s * Math.sin(psi + phi)], idx * 4);
    }
    return out;
  },
  { dist: 1.9, scale: 4.0, rate: [0.25, 0.0, 0.18] }
);

/** Glome: the 3-sphere itself, a 4D ball's surface, tumbling through 3D. */
const glome = shape4(
  "glome",
  (count) => {
    const out = new Float32Array(count * 4);
    for (let idx = 0; idx < count; idx++) {
      const [s1, s2, s3] = ld3(idx);
      const eta = Math.asin(Math.sqrt(s1));
      const a = s2 * TAU;
      const b = s3 * TAU;
      out.set([Math.cos(eta) * Math.cos(a), Math.cos(eta) * Math.sin(a), Math.sin(eta) * Math.cos(b), Math.sin(eta) * Math.sin(b)], idx * 4);
    }
    return out;
  },
  { dist: 2.1, scale: 4.2, rate: [0.5, 0.3, 0.2] }
);

export const fourDShapes = {
  tesseract,
  cell24,
  cliffordTorus,
  hopfFibration,
  glome,
} satisfies Record<string, ShapeFn>;
