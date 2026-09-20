import type { ShapeFn, Vec3 } from "./types";

export const TAU = Math.PI * 2;
export const PHI = (1 + Math.sqrt(5)) / 2;
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/* ------------------------------------------------------------------ */
/* Scalar helpers                                                      */
/* ------------------------------------------------------------------ */

export const fract = (x: number): number => x - Math.floor(x);

export const clamp = (x: number, lo = 0, hi = 1): number =>
  x < lo ? lo : x > hi ? hi : x;

export const mix = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

export const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const sech = (x: number): number => 1 / Math.cosh(x);

/* ------------------------------------------------------------------ */
/* Low-discrepancy sequences (Roberts R1 / R2 / R3).                   */
/* They spread points evenly without visible grid lines or randomness. */
/* ------------------------------------------------------------------ */

export const ld1 = (k: number): number => fract(0.5 + k * 0.6180339887498949);

export const ld2 = (k: number): [number, number] => [
  fract(0.5 + k * 0.7548776662466927),
  fract(0.5 + k * 0.5698402909980532),
];

export const ld3 = (k: number): Vec3 => [
  fract(0.5 + k * 0.8191725133961645),
  fract(0.5 + k * 0.6710436067037893),
  fract(0.5 + k * 0.5497004779019703),
];

/** Small deterministic PRNG so precomputed shapes look the same every run. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Evenly distributed point on the unit sphere (Fibonacci lattice). */
export function fibSphere(idx: number, count: number): Vec3 {
  const y = 1 - (2 * (idx + 0.5)) / count;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const a = idx * GOLDEN_ANGLE;
  return [r * Math.cos(a), y, r * Math.sin(a)];
}

/* ------------------------------------------------------------------ */
/* Rotations                                                           */
/* ------------------------------------------------------------------ */

export const rotX = (p: Vec3, a: number): Vec3 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
};

export const rotY = (p: Vec3, a: number): Vec3 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
};

export const rotZ = (p: Vec3, a: number): Vec3 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
};

/* ------------------------------------------------------------------ */
/* Noise (deterministic value noise + fBm)                             */
/* ------------------------------------------------------------------ */

export function hash2(x: number, y: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return mix(mix(a, b, sx), mix(c, d, sx), sy);
}

export function fbm(x: number, y: number, octaves = 5): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * freq + o * 17.3, y * freq - o * 9.1);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/* ------------------------------------------------------------------ */
/* Memoisation for point clouds that are computed once                  */
/* ------------------------------------------------------------------ */

const store = new Map<string, unknown>();

export function memo<T>(key: string, build: () => T): T {
  if (store.has(key)) return store.get(key) as T;
  const value = build();
  store.set(key, value);
  return value;
}

export const pointAt = (arr: Float32Array, idx: number): Vec3 => {
  const k = (idx % (arr.length / 3)) * 3;
  return [arr[k], arr[k + 1], arr[k + 2]];
};

const finite = (x: number): number => (Number.isFinite(x) ? x : 0);

/* ------------------------------------------------------------------ */
/* Cloud builders                                                      */
/* ------------------------------------------------------------------ */

/** Sample a (u, v) parametric surface on the same grid the app uses. */
export function gridCloud(
  count: number,
  segX: number,
  segY: number,
  f: (u: number, v: number, i: number, j: number) => Vec3
): Float32Array {
  const out = new Float32Array(count * 3);
  for (let idx = 0; idx < count; idx++) {
    const i = Math.floor(idx / segY);
    const j = idx % segY;
    const p = f(i / segX, j / segY, i, j);
    out[idx * 3] = finite(p[0]);
    out[idx * 3 + 1] = finite(p[1]);
    out[idx * 3 + 2] = finite(p[2]);
  }
  return out;
}

/** Generic builder: f receives the particle index and s = (idx+0.5)/count. */
export function indexCloud(
  count: number,
  f: (idx: number, s: number) => Vec3
): Float32Array {
  const out = new Float32Array(count * 3);
  for (let idx = 0; idx < count; idx++) {
    const p = f(idx, (idx + 0.5) / count);
    out[idx * 3] = finite(p[0]);
    out[idx * 3 + 1] = finite(p[1]);
    out[idx * 3 + 2] = finite(p[2]);
  }
  return out;
}

/** Spread `count` points evenly along a list of 3D segments [ax,ay,az,bx,by,bz,…]. */
export function sampleSegments(segs: number[], count: number): Float32Array {
  const n = segs.length / 6;
  const cum = new Float64Array(n + 1);
  for (let k = 0; k < n; k++) {
    const b = k * 6;
    cum[k + 1] =
      cum[k] +
      Math.hypot(segs[b + 3] - segs[b], segs[b + 4] - segs[b + 1], segs[b + 5] - segs[b + 2]);
  }
  const total = cum[n];
  const out = new Float32Array(count * 3);
  let s = 0;
  for (let p = 0; p < count; p++) {
    const d = ((p + 0.5) / count) * total;
    while (s < n - 1 && cum[s + 1] < d) s++;
    const len = cum[s + 1] - cum[s];
    const t = len > 1e-12 ? (d - cum[s]) / len : 0;
    const b = s * 6;
    out[p * 3] = segs[b] + (segs[b + 3] - segs[b]) * t;
    out[p * 3 + 1] = segs[b + 1] + (segs[b + 4] - segs[b + 1]) * t;
    out[p * 3 + 2] = segs[b + 2] + (segs[b + 5] - segs[b + 2]) * t;
  }
  return out;
}

/** Convert a polyline of points into a flat segment list. */
export function polylineToSegments(pts: Vec3[], closed = false): number[] {
  const segs: number[] = [];
  const n = pts.length;
  const last = closed ? n : n - 1;
  for (let k = 0; k < last; k++) {
    const a = pts[k];
    const b = pts[(k + 1) % n];
    segs.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }
  return segs;
}

/**
 * Tube (thick line) around a parametric curve, sampled by arc length so the
 * density stays even. `curve` takes t in [0, 1).
 */
export function tubeCloud(
  count: number,
  curve: (t: number) => Vec3,
  radius: number
): Float32Array {
  const N = 4096;
  const cum = new Float64Array(N + 1);
  let prev = curve(0);
  for (let k = 1; k <= N; k++) {
    const p = curve(k / N);
    cum[k] = cum[k - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
    prev = p;
  }
  const total = cum[N];
  const out = new Float32Array(count * 3);
  let seg = 0;
  for (let idx = 0; idx < count; idx++) {
    const d = ((idx + 0.5) / count) * total;
    while (seg < N - 1 && cum[seg + 1] < d) seg++;
    const len = cum[seg + 1] - cum[seg];
    const t = (seg + (len > 1e-12 ? (d - cum[seg]) / len : 0)) / N;
    const h = 1e-3;
    const p = curve(t);
    const a = curve(t + h);
    const b = curve(t - h);
    let tx = a[0] - b[0];
    let ty = a[1] - b[1];
    let tz = a[2] - b[2];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl;
    ty /= tl;
    tz /= tl;
    // any vector not parallel to the tangent gives a valid cross-section frame
    const rx = Math.abs(ty) < 0.9 ? 0 : 1;
    const ry = Math.abs(ty) < 0.9 ? 1 : 0;
    let nx = ry * tz;
    let ny = -rx * tz;
    let nz = rx * ty - ry * tx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    const bx = ty * nz - tz * ny;
    const by = tz * nx - tx * nz;
    const bz = tx * ny - ty * nx;
    const ang = idx * GOLDEN_ANGLE;
    const ca = Math.cos(ang) * radius;
    const sa = Math.sin(ang) * radius;
    out[idx * 3] = finite(p[0] + nx * ca + bx * sa);
    out[idx * 3 + 1] = finite(p[1] + ny * ca + by * sa);
    out[idx * 3 + 2] = finite(p[2] + nz * ca + bz * sa);
  }
  return out;
}

/**
 * Centre a cloud on its bounding box and scale it uniformly so its largest
 * half-extent equals `radius`. A tiny percentile trim keeps stray outliers
 * (singular tips of some surfaces) from shrinking the whole shape.
 */
export function fitCloud(
  a: Float32Array,
  radius: number,
  trim = 0.004,
  mode: "box" | "sphere" = "box"
): Float32Array {
  const n = a.length / 3;
  const lo = [0, 0, 0];
  const hi = [0, 0, 0];
  const col = new Float32Array(n);
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < n; i++) col[i] = a[i * 3 + k];
    col.sort();
    lo[k] = col[Math.floor(trim * (n - 1))];
    hi[k] = col[Math.ceil((1 - trim) * (n - 1))];
  }
  const centre = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2);
  let half = Math.max(...[0, 1, 2].map((k) => (hi[k] - lo[k]) / 2));
  if (mode === "sphere") {
    // scale by the (trimmed) largest distance from the centre instead
    const dist = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      dist[i] = Math.hypot(
        a[i * 3] - centre[0],
        a[i * 3 + 1] - centre[1],
        a[i * 3 + 2] - centre[2]
      );
    }
    dist.sort();
    half = dist[Math.ceil((1 - trim) * (n - 1))];
  }
  const s = half > 1e-9 ? radius / half : 1;
  const lim = radius * 1.5;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) {
      a[i * 3 + k] = clamp((a[i * 3 + k] - centre[k]) * s, -lim, lim);
    }
  }
  return a;
}

/* ------------------------------------------------------------------ */
/* Shape factories                                                     */
/* ------------------------------------------------------------------ */

export interface CloudOptions {
  /** Fit the cloud to this radius (default 5). Pass 0 to keep raw units. */
  radius?: number;
  /** "box" fits the largest half-extent, "sphere" fits the circumradius. */
  fit?: "box" | "sphere";
  /** Rotation speed around the Y axis in rad/s (default 0.25). */
  spin?: number;
  /** Fixed tilt around the X axis in radians. */
  tilt?: number;
  /** Optional sway: tilt oscillation amplitude around X. */
  rock?: number;
  /** Optional swing: side-to-side rotation amplitude around Y (instead of a full spin). */
  swing?: number;
}

/**
 * Build a shape from a cloud that is computed once (lazily) and then simply
 * rotated every frame. Perfect for anything that doesn't need per-frame maths.
 */
export function cloudShape(
  name: string,
  build: (count: number, segX: number, segY: number) => Float32Array,
  opts: CloudOptions = {}
): ShapeFn {
  const radius = opts.radius ?? 5;
  const spin = opts.spin ?? 0.25;
  const tilt = opts.tilt ?? 0;
  const rock = opts.rock ?? 0;
  const swing = opts.swing ?? 0;
  return (c) => {
    const arr = memo(`${name}:${c.count}:${c.segX}`, () => {
      const cloud = build(c.count, c.segX, c.segY);
      return radius > 0 ? fitCloud(cloud, radius, 0.004, opts.fit ?? "box") : cloud;
    });
    let p = pointAt(arr, c.idx);
    if (tilt || rock) p = rotX(p, tilt + rock * Math.sin(c.time * 0.7));
    if (swing) p = rotY(p, swing * Math.sin(c.time * 0.5));
    if (spin) p = rotY(p, c.time * spin);
    return p;
  };
}

/** Static parametric surface P(u, v) with u, v in [0, 1). */
export function surfaceShape(
  name: string,
  f: (u: number, v: number) => Vec3,
  opts: CloudOptions = {}
): ShapeFn {
  return cloudShape(name, (count, sx, sy) => gridCloud(count, sx, sy, f), opts);
}

/** Static tube around a closed/open curve, curve(t) with t in [0, 1). */
export function tubeShape(
  name: string,
  curve: (t: number) => Vec3,
  radius: number,
  opts: CloudOptions = {}
): ShapeFn {
  return cloudShape(name, (count) => tubeCloud(count, curve, radius), opts);
}
