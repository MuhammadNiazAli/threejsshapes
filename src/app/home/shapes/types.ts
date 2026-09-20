export type Vec3 = [number, number, number];

/**
 * Everything a shape needs to know about the particle it is positioning.
 * One mutable object is reused for all particles (no per-particle allocation).
 */
export interface ShapeContext {
  /** Grid column (0..segX-1) and row (0..segY-1) of the particle. */
  i: number;
  j: number;
  /** i / segX and j / segY, both in [0, 1). */
  u: number;
  v: number;
  /** Flat particle index (i * segY + j) and total particle count. */
  idx: number;
  count: number;
  /** Position on the original flat grid (same as the built-in shapes use). */
  x0: number;
  z0: number;
  /** Elapsed time in seconds and a random per-particle phase (0..2π). */
  time: number;
  phase: number;
  width: number;
  height: number;
  segX: number;
  segY: number;
}

export type ShapeFn = (c: ShapeContext) => Vec3;
