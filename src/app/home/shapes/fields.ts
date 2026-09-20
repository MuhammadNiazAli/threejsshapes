import type { ShapeFn, Vec3 } from "./types";
import { TAU, fbm, hash2, ld2, ld3, rotX, rotY, sech, smoothstep } from "./math";

/* ------------------------------------------------------------------ */
/* Animated fields: waves, terrains and structures built on the grid    */
/* ------------------------------------------------------------------ */

/** Ocean built from Gerstner waves: sharp crests, broad troughs, real wave physics. */
const gerstnerOcean: ShapeFn = (c) => {
  const waves = [
    { a: 0.9, l: 13, d: 0.3 },
    { a: 0.55, l: 8, d: -0.5 },
    { a: 0.32, l: 5, d: 1.1 },
    { a: 0.18, l: 3, d: -1.0 },
  ];
  let x = c.x0;
  let z = c.z0;
  let y = 0;
  for (const w of waves) {
    const k = TAU / w.l;
    const dx = Math.cos(w.d);
    const dz = Math.sin(w.d);
    const phase = k * (dx * c.x0 + dz * c.z0) - Math.sqrt(9.8 * k) * 0.7 * c.time;
    const q = 0.5 / (k * w.a * waves.length);
    x += q * w.a * dx * Math.cos(phase);
    z += q * w.a * dz * Math.cos(phase);
    y += w.a * Math.sin(phase);
  }
  return [x * 0.8, y * 1.7 - 1, z * 1.2];
};

/** Chladni plate: sand-figure nodal lines that morph as the frequency drifts. */
const chladniPlate: ShapeFn = (c) => {
  const X = c.x0 / 15;
  const Z = c.z0 / 7.5;
  const n = 3 + 1.6 * (0.5 + 0.5 * Math.sin(c.time * 0.35));
  const m = 2 + 1.4 * (0.5 + 0.5 * Math.sin(c.time * 0.27 + 1));
  const f = Math.cos(n * Math.PI * X) * Math.cos(m * Math.PI * Z) - Math.cos(m * Math.PI * X) * Math.cos(n * Math.PI * Z);
  return [c.x0 * 0.75, f * 2.6, c.z0 * 1.1];
};

/** Mexican-hat wavelet (sinc) breathing gently. */
const sombrero: ShapeFn = (c) => {
  const X = c.x0 * 0.6;
  const rho = Math.hypot(X, c.z0) * 1.05;
  const s = rho < 1e-4 ? 1 : Math.sin(rho) / rho;
  return [X * 1.25, 5.4 * s * (1 + 0.15 * Math.sin(c.time * 1.5)) - 1, c.z0 * 1.15];
};

/** Two point sources radiating waves that interfere in a diamond pattern. */
const interference: ShapeFn = (c) => {
  const X = c.x0 * 0.6;
  const d1 = Math.hypot(X + 4, c.z0);
  const d2 = Math.hypot(X - 4, c.z0);
  const w = (d: number) => Math.sin(1.6 * d - 2.4 * c.time) / Math.sqrt(1 + 0.4 * d);
  return [X * 1.25, 2.2 * (w(d1) + w(d2)) - 0.5, c.z0 * 1.15];
};

/** Endless fractal mountain range that you fly over. */
const terrain: ShapeFn = (c) => {
  const n = fbm(c.x0 * 0.14 + c.time * 0.3, c.z0 * 0.26, 5);
  return [c.x0 * 0.8, (n - 0.42) * 15, c.z0 * 1.2];
};

/** Wind-blown sand dunes with fine ripples on their slopes. */
const dunes: ShapeFn = (c) => {
  const warp = 2.2 * fbm(c.x0 * 0.1, c.z0 * 0.2, 3);
  const phase = c.x0 * 0.5 + warp + c.z0 * 0.15 - c.time * 0.3;
  const f = Math.sin(phase) + 0.35 * Math.sin(2 * phase + 0.8);
  const ripples = 0.12 * Math.sin(c.x0 * 5 + c.z0 * 0.7);
  return [c.x0 * 0.8, 1.8 * f * (0.65 + 0.35 * Math.sin(c.z0 * 0.35 + 1)) - 1.2 + ripples, c.z0 * 1.2];
};

/** Three sech² solitons that pass through each other without changing shape. */
const solitons: ShapeFn = (c) => {
  const t = c.time;
  const X = c.x0 * 0.7;
  let y = -3.4;
  const lumps = [
    { A: 6.2, w: 0.7, fx: 0.31, fz: 0.23, px: 0, pz: 0 },
    { A: 4.6, w: 0.85, fx: 0.4, fz: 0.29, px: 2, pz: 1 },
    { A: 3.6, w: 1.05, fx: 0.23, fz: 0.37, px: 4, pz: 3 },
  ];
  for (const l of lumps) {
    const cx = 7.5 * Math.sin(l.fx * t + l.px);
    const cz = 4.2 * Math.cos(l.fz * t + l.pz);
    y += l.A * sech(l.w * Math.hypot(X - cx, c.z0 - cz)) ** 2;
  }
  return [X * 1.25, y, c.z0 * 1.15];
};

/** Northern-lights curtains rippling in the solar wind. */
const auroraCurtain: ShapeFn = (c) => {
  const layer = c.i % 2;
  const u = Math.floor(c.i / 2) / (c.segX / 2);
  const x = (u - 0.5) * 26;
  const v = c.v;
  const y = (v - 0.5) * 9.6;
  const z =
    (layer ? -3.2 : 3.2) +
    3 * Math.sin(x * 0.3 + c.time * 0.5 + layer * 2) +
    1.2 * Math.sin(x * 0.8 - c.time * 0.9) +
    0.9 * Math.sin(y * 0.9 + x * 0.35 + c.time * 1.4) * (0.3 + v);
  return [x, y, z];
};

/** Basalt-column hex terraces whose heights ripple like a heat map. */
const hexTerrace: ShapeFn = (c) => {
  const R = 1.15;
  const X = c.x0 * 0.7;
  const Z = c.z0;
  // pixel -> axial hex coordinates, then cube-round
  const q = ((Math.sqrt(3) / 3) * X - Z / 3) / R;
  const r = ((2 / 3) * Z) / R;
  let rx = Math.round(q);
  let rz = Math.round(r);
  const ry = Math.round(-q - r);
  const dq = Math.abs(rx - q);
  const dr = Math.abs(rz - r);
  const ds = Math.abs(ry - (-q - r));
  if (dq > dr && dq > ds) rx = -ry - rz;
  else if (dr > ds) rz = -rx - ry;
  const cx = R * Math.sqrt(3) * (rx + rz / 2);
  const cz = R * 1.5 * rz;
  const dx = X - cx;
  const dz = Z - cz;
  const a = (Math.sqrt(3) / 2) * R;
  const edge = Math.max(
    Math.abs(dx),
    Math.abs(dx * 0.5 + dz * (Math.sqrt(3) / 2)),
    Math.abs(-dx * 0.5 + dz * (Math.sqrt(3) / 2))
  ) / a;
  const h = 0.5 + 0.5 * Math.sin(cx * 0.45 + c.time * 1.1) * Math.cos(cz * 0.6 - c.time * 0.8);
  const level = Math.floor(h * 6) / 6;
  const y = -4 + 8.4 * level - (edge > 0.9 ? 0.55 : 0);
  return [X * 1.25, y, Z * 1.15];
};

/** A miniature city whose towers pulse like an equaliser. */
const cityscape: ShapeFn = (c) => {
  const n = 10;
  const b = c.idx % (n * n);
  const bx = b % n;
  const bz = Math.floor(b / n);
  const cx = (bx - (n - 1) / 2) * 1.4;
  const cz = (bz - (n - 1) / 2) * 1.4;
  const hh = hash2(bx * 7 + 3, bz * 13 + 5);
  const dist2 = cx * cx + cz * cz;
  const pulse = 0.85 + 0.15 * Math.sin(c.time * 2 + hh * TAU);
  const h = (0.7 + 7.4 * hh ** 2.2 * Math.exp(-dist2 / 55)) * pulse;
  const w = 0.5;
  const [a, s, t] = ld3(c.idx);
  const roof = w * w * 4;
  const wall = 2 * w * h;
  const pick = s * (roof + 4 * wall);
  let p: Vec3;
  if (pick < roof) {
    p = [cx + (a - 0.5) * 2 * w, -4.5 + h, cz + (t - 0.5) * 2 * w];
  } else {
    const side = Math.min(3, Math.floor((pick - roof) / wall));
    const along = (a - 0.5) * 2 * w;
    const up = -4.5 + t * h;
    p =
      side === 0 ? [cx + w, up, cz + along] :
      side === 1 ? [cx - w, up, cz + along] :
      side === 2 ? [cx + along, up, cz + w] :
                   [cx + along, up, cz - w];
  }
  return rotX(rotY(p, c.time * 0.15), 0.25);
};

/** Spacetime curvature: a warped grid falling into a gravity well. */
const gravityWell: ShapeFn = (c) => {
  const R = 11;
  const [a, b] = ld2(c.idx);
  const rings = 26;
  const spokes = 40;
  let r: number;
  let ang: number;
  if (c.idx % 2 === 0) {
    const m = Math.floor(a * rings);
    r = R * Math.pow((m + 1) / rings, 1.3);
    ang = b * TAU;
  } else {
    const k = Math.floor(a * spokes);
    ang = (k / spokes) * TAU;
    r = R * Math.pow(b, 1.3);
  }
  const y = 3.5 - 8.5 / Math.sqrt(1 + (r / 1.3) ** 2) + 0.15 * Math.sin(r * 1.4 - c.time * 3);
  return rotX([r * Math.cos(ang), y, r * Math.sin(ang)], 0.3);
};

/** Worley / Voronoi cracks: a slowly shifting mosaic of cells. */
const voronoiCracks: ShapeFn = (c) => {
  const size = 2.4;
  const X = c.x0 * 0.7;
  const px = X / size;
  const pz = c.z0 / size;
  const ix = Math.floor(px);
  const iz = Math.floor(pz);
  let f1 = 9;
  let f2 = 9;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx;
      const cz = iz + dz;
      const h1 = hash2(cx, cz);
      const h2 = hash2(cx + 91, cz + 17);
      const fx = cx + 0.5 + 0.4 * Math.sin(c.time * 0.5 + h1 * TAU);
      const fz = cz + 0.5 + 0.4 * Math.cos(c.time * 0.4 + h2 * TAU);
      const d = Math.hypot(px - fx, pz - fz);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) f2 = d;
    }
  }
  const dome = 1 - smoothstep(0, 1.05, f1);
  const crack = smoothstep(0, 0.6, f2 - f1);
  return [X * 1.25, -3.6 + 5.8 * dome * (0.55 + 0.45 * crack), c.z0 * 1.15];
};

/** A cubic crystal lattice carrying a travelling phonon wave. */
const crystalLattice: ShapeFn = (c) => {
  const n = 20;
  const k = c.idx % (n * n * n);
  const a = k % n;
  const b = Math.floor(k / n) % n;
  const d = Math.floor(k / (n * n));
  const sp = 9.4 / (n - 1);
  const shifted = c.idx >= n * n * n ? 0.5 : 0; // spare particles become interstitial atoms
  let px = (a + shifted - (n - 1) / 2) * sp;
  let py = (b + shifted - (n - 1) / 2) * sp;
  let pz = (d + shifted - (n - 1) / 2) * sp;
  const wave = Math.sin(0.6 * (px + pz) - c.time * 2.2);
  py += 0.45 * wave;
  px += 0.2 * Math.cos(0.6 * (px + pz) - c.time * 2.2);
  pz += 0.1 * wave;
  return rotY([px, py, pz], c.time * 0.2);
};

export const fieldShapes = {
  gerstnerOcean,
  chladniPlate,
  sombrero,
  interference,
  terrain,
  dunes,
  solitons,
  auroraCurtain,
  hexTerrace,
  cityscape,
  gravityWell,
  voronoiCracks,
  crystalLattice,
} satisfies Record<string, ShapeFn>;
