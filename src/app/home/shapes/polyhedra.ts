import type { ShapeFn, Vec3 } from "./types";
import { PHI, cloudShape, sampleSegments } from "./math";

/* ------------------------------------------------------------------ */
/* Platonic, Archimedean and compound polyhedra drawn as wireframes     */
/* ------------------------------------------------------------------ */

const key = (p: Vec3) => p.map((x) => Math.round(x * 1e4)).join(",");

/** All distinct permutations (or only cyclic ones) with every sign combination. */
function expand(base: number[], cyclic = false): Vec3[] {
  const perms: number[][] = [];
  if (cyclic) {
    for (let k = 0; k < 3; k++) perms.push([base[k % 3], base[(k + 1) % 3], base[(k + 2) % 3]]);
  } else {
    const idx = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];
    for (const p of idx) perms.push([base[p[0]], base[p[1]], base[p[2]]]);
  }
  const seen = new Map<string, Vec3>();
  for (const p of perms) {
    for (let mask = 0; mask < 8; mask++) {
      const q: Vec3 = [
        mask & 1 ? -p[0] : p[0],
        mask & 2 ? -p[1] : p[1],
        mask & 4 ? -p[2] : p[2],
      ];
      seen.set(key(q), q);
    }
  }
  return Array.from(seen.values());
}

const unique = (pts: Vec3[]): Vec3[] => Array.from(new Map(pts.map((p) => [key(p), p])).values());

/** Edges = every pair of vertices at the minimum distance. */
function edgesOf(verts: Vec3[]): number[] {
  let min = Infinity;
  for (let a = 0; a < verts.length; a++) {
    for (let b = a + 1; b < verts.length; b++) {
      min = Math.min(min, Math.hypot(verts[a][0] - verts[b][0], verts[a][1] - verts[b][1], verts[a][2] - verts[b][2]));
    }
  }
  const segs: number[] = [];
  for (let a = 0; a < verts.length; a++) {
    for (let b = a + 1; b < verts.length; b++) {
      const d = Math.hypot(verts[a][0] - verts[b][0], verts[a][1] - verts[b][1], verts[a][2] - verts[b][2]);
      if (Math.abs(d - min) < min * 1e-3) segs.push(...verts[a], ...verts[b]);
    }
  }
  return segs;
}

const wire = (name: string, build: () => number[]) =>
  cloudShape(name, (count) => sampleSegments(build(), count), {
    spin: 0.3,
    tilt: 0.35,
    radius: 5.2,
    fit: "sphere",
  });

const TETRA: Vec3[] = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
];

const ICOSA: Vec3[] = expand([0, 1, PHI], true);

/** Regular tetrahedron. */
const tetrahedron = wire("tetrahedron", () => edgesOf(TETRA));

/** Regular octahedron. */
const octahedron = wire("octahedron", () => edgesOf(expand([1, 0, 0])));

/** Regular icosahedron (20 triangular faces). */
const icosahedron = wire("icosahedron", () => edgesOf(ICOSA));

/** Regular dodecahedron (12 pentagonal faces). */
const dodecahedron = wire("dodecahedron", () =>
  edgesOf(unique([...expand([1, 1, 1]), ...expand([0, 1 / PHI, PHI], true)]))
);

/** Cuboctahedron: 8 triangles + 6 squares. */
const cuboctahedron = wire("cuboctahedron", () => edgesOf(expand([1, 1, 0])));

/** Truncated octahedron: the space-filling Kelvin cell. */
const truncatedOctahedron = wire("truncatedOctahedron", () => edgesOf(expand([0, 1, 2])));

/** Truncated icosahedron: the football / buckminsterfullerene (C60) cage. */
const truncatedIcosahedron = wire("truncatedIcosahedron", () =>
  edgesOf(
    unique([
      ...expand([0, 1, 3 * PHI], true),
      ...expand([1, 2 + PHI, 2 * PHI], true),
      ...expand([PHI, 2, 2 * PHI + 1], true),
    ])
  )
);

/** Icosidodecahedron: 20 triangles + 12 pentagons, 30 vertices. */
const icosidodecahedron = wire("icosidodecahedron", () =>
  edgesOf(unique([...expand([0, 0, PHI], true), ...expand([0.5, PHI / 2, (PHI * PHI) / 2], true)]))
);

/** Rhombicuboctahedron: 8 triangles + 18 squares. */
const rhombicuboctahedron = wire("rhombicuboctahedron", () =>
  edgesOf(expand([1, 1, 1 + Math.SQRT2]))
);

/** Stella octangula: two interpenetrating tetrahedra (Kepler's star). */
const stellaOctangula = wire("stellaOctangula", () => [
  ...edgesOf(TETRA),
  ...edgesOf(TETRA.map((p): Vec3 => [-p[0], -p[1], -p[2]])),
]);

/** Geodesic sphere: an icosahedron subdivided three times per edge. */
const geodesicSphere = wire("geodesicSphere", () => {
  const n = 3;
  const faces: [Vec3, Vec3, Vec3][] = [];
  let min = Infinity;
  for (let a = 1; a < ICOSA.length; a++) {
    min = Math.min(min, Math.hypot(ICOSA[0][0] - ICOSA[a][0], ICOSA[0][1] - ICOSA[a][1], ICOSA[0][2] - ICOSA[a][2]));
  }
  const near = (p: Vec3, q: Vec3) =>
    Math.abs(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) - min) < min * 1e-3;
  for (let a = 0; a < ICOSA.length; a++)
    for (let b = a + 1; b < ICOSA.length; b++)
      for (let c = b + 1; c < ICOSA.length; c++)
        if (near(ICOSA[a], ICOSA[b]) && near(ICOSA[b], ICOSA[c]) && near(ICOSA[a], ICOSA[c]))
          faces.push([ICOSA[a], ICOSA[b], ICOSA[c]]);

  const point = (f: [Vec3, Vec3, Vec3], i: number, j: number): Vec3 => {
    const k = n - i - j;
    const p: Vec3 = [
      (f[0][0] * k + f[1][0] * i + f[2][0] * j) / n,
      (f[0][1] * k + f[1][1] * i + f[2][1] * j) / n,
      (f[0][2] * k + f[1][2] * i + f[2][2] * j) / n,
    ];
    const l = Math.hypot(p[0], p[1], p[2]) || 1;
    return [p[0] / l, p[1] / l, p[2] / l];
  };
  const segs = new Map<string, number[]>();
  const add = (p: Vec3, q: Vec3) => {
    const k1 = key(p);
    const k2 = key(q);
    segs.set(k1 < k2 ? k1 + "|" + k2 : k2 + "|" + k1, [...p, ...q]);
  };
  for (const f of faces) {
    for (let i = 0; i <= n; i++) {
      for (let j = 0; i + j <= n; j++) {
        if (i + j < n) {
          add(point(f, i, j), point(f, i + 1, j));
          add(point(f, i, j), point(f, i, j + 1));
          add(point(f, i + 1, j), point(f, i, j + 1));
        }
      }
    }
  }
  return Array.from(segs.values()).flat();
});

export const polyhedraShapes = {
  tetrahedron,
  octahedron,
  icosahedron,
  dodecahedron,
  cuboctahedron,
  truncatedOctahedron,
  truncatedIcosahedron,
  icosidodecahedron,
  rhombicuboctahedron,
  stellaOctangula,
  geodesicSphere,
} satisfies Record<string, ShapeFn>;
