import type { ShapeFn } from "./types";
import { surfaceShapes } from "./surfaces";
import { knotShapes } from "./knots";
import { fourDShapes } from "./fourD";
import { polyhedraShapes } from "./polyhedra";
import { fractalShapes } from "./fractals";
import { attractorShapes } from "./attractors";
import { tpmsShapes } from "./tpms";
import { natureShapes } from "./nature";
import { objectShapes } from "./objects";
import { fieldShapes } from "./fields";
import { scienceShapes } from "./science";

export type { ShapeContext, ShapeFn, Vec3 } from "./types";

/**
 * 100 additional particle shapes, grouped by theme. Every entry maps a shape
 * name to a function that returns the target position of one particle.
 */
export const extraShapes = {
  ...surfaceShapes,
  ...knotShapes,
  ...fourDShapes,
  ...polyhedraShapes,
  ...fractalShapes,
  ...attractorShapes,
  ...tpmsShapes,
  ...natureShapes,
  ...objectShapes,
  ...fieldShapes,
  ...scienceShapes,
} satisfies Record<string, ShapeFn>;

export type ExtraShapeType = keyof typeof extraShapes;

/** Names in display order (grouped by theme, same order as above). */
export const EXTRA_SHAPE_NAMES = Object.keys(extraShapes) as ExtraShapeType[];
