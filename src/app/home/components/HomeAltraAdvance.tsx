"use client";

import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  extraShapes,
  EXTRA_SHAPE_NAMES,
  type ExtraShapeType,
  type ShapeContext,
  type ShapeFn,
} from "../shapes";

type ShapeType =
  | ExtraShapeType
  | "plane"
  | "wave"
  | "sphere"
  | "cone"
  | "torus"
  | "heart"
  | "spiral"
  | "sin"
  | "cloud"
  | "random"
  | "pyramid"
  | "cylinder"
  | "ellipsoid"
  | "hyperbola"
  | "lissajous"
  | "star"
  | "mobius"
  | "klein"
  | "ring"
  | "helix"
  | "doubleHelix"
  | "figure8"
  | "parabola"
  | "sineWave"
  | "cosineWave"
  | "sawtooth"
  | "triangleWave"
  | "twistWave"
  | "vortex"
  | "cloudDense"
  | "smoke"
  | "dust"
  | "ribbon"
  | "wave2D"
  | "wave3D"
  | "ripple"
  | "grid"
  | "checker"
  | "circle"
  | "ellipse"
  | "petals"
  | "flower"
  | "tree"
  | "branch"
  | "crown"
  | "fan"
  | "spiral2"
  | "helix2"
  | "particleStorm"
  | "randomScatter"
  | "nebula"
  | "galaxy"
  | "tornado"
  | "pulse";

type MaterialTheme =
  | "neon"
  | "sunset"
  | "ocean"
  | "forest"
  | "fire"
  | "purple"
  | "gold"
  | "silver"
  | "copper"
  | "bronze"
  | "jade"
  | "ruby"
  | "sapphire"
  | "emerald"
  | "diamond"
  | "amethyst"
  | "coral"
  | "mint"
  | "lavender"
  | "rose"
  | "peach"
  | "cherry"
  | "lime"
  | "navy"
  | "maroon"
  | "olive"
  | "teal"
  | "cyan"
  | "magenta"
  | "indigo"
  | "violet"
  | "turquoise"
  | "aquamarine"
  | "khaki"
  | "beige"
  | "cream"
  | "chocolate"
  | "coffee"
  | "sand"
  | "rust"
  | "terracotta"
  | "clay"
  | "slate"
  | "graphite"
  | "charcoal"
  | "ivory"
  | "pearl"
  | "platinum"
  | "chrome"
  | "titanium"
  | "steel"
  | "iron"
  | "silver-blue"
  | "gold-white"
  | "copper-green"
  | "bronze-brown"
  | "electric"
  | "holographic"
  | "gradient-rgb"
  | "gradient-hsv"
  | "candy"
  | "pastel"
  | "neon-pink"
  | "neon-green"
  | "neon-blue"
  | "neon-purple"
  | "neon-orange"
  | "neon-cyan"
  | "aurora"
  | "sunset-gradient"
  | "ocean-gradient"
  | "forest-gradient"
  | "fire-gradient"
  | "ice"
  | "lava"
  | "plasma"
  | "energy"
  | "rainbow"
  | "rainbow-pastel"
  | "monochrome-blue"
  | "monochrome-red"
  | "monochrome-green"
  | "monochrome-purple"
  | "warm-metals"
  | "cool-metals"
  | "gem-stones"
  | "nature"
  | "space"
  | "cyberpunk"
  | "retro-80s"
  | "synthwave"
  | "dark-matter"
  | "light-matter"
  | "quantum"
  | "thermal"
  | "infrared"
  | "ultraviolet"
  | "rgb-split"
  | "cmyk"
  | "hsv-wheel"
  | "color-spectrum";

interface ColorScheme {
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
  quaternary?: [number, number, number];
}

const colorSchemes: Record<MaterialTheme, ColorScheme> = {
  neon: { primary: [0, 1, 1], secondary: [1, 0, 1], accent: [1, 1, 0] },
  sunset: { primary: [1, 0.5, 0], secondary: [1, 0, 0.5], accent: [1, 1, 0] },
  ocean: {
    primary: [0, 0.5, 1],
    secondary: [0, 1, 1],
    accent: [0.1, 0.7, 0.9],
  },
  forest: { primary: [0, 0.5, 0], secondary: [0, 1, 0.5], accent: [0.5, 1, 0] },
  fire: { primary: [1, 0, 0], secondary: [1, 0.5, 0], accent: [1, 1, 0] },
  purple: { primary: [0.5, 0, 1], secondary: [1, 0, 1], accent: [0.8, 0, 0.8] },
  gold: { primary: [1, 0.84, 0], secondary: [1, 0.65, 0], accent: [1, 1, 0] },
  silver: {
    primary: [0.75, 0.75, 0.75],
    secondary: [0.9, 0.9, 0.9],
    accent: [0.6, 0.6, 0.6],
  },
  copper: {
    primary: [0.72, 0.45, 0.2],
    secondary: [0.8, 0.5, 0.2],
    accent: [0.9, 0.6, 0.3],
  },
  bronze: {
    primary: [0.55, 0.35, 0.1],
    secondary: [0.65, 0.42, 0.15],
    accent: [0.75, 0.5, 0.2],
  },
  jade: {
    primary: [0.3, 0.8, 0.5],
    secondary: [0.2, 0.9, 0.6],
    accent: [0.4, 1, 0.7],
  },
  ruby: {
    primary: [0.9, 0.1, 0.3],
    secondary: [1, 0.2, 0.4],
    accent: [1, 0, 0.2],
  },
  sapphire: {
    primary: [0.1, 0.3, 0.9],
    secondary: [0.2, 0.5, 1],
    accent: [0, 0.4, 1],
  },
  emerald: {
    primary: [0.1, 0.8, 0.3],
    secondary: [0.2, 0.9, 0.4],
    accent: [0.3, 1, 0.5],
  },
  diamond: {
    primary: [0.8, 0.9, 1],
    secondary: [0.9, 0.95, 1],
    accent: [1, 1, 1],
  },
  amethyst: {
    primary: [0.6, 0.3, 0.9],
    secondary: [0.7, 0.4, 1],
    accent: [0.8, 0.5, 1],
  },
  coral: {
    primary: [1, 0.5, 0.4],
    secondary: [1, 0.6, 0.5],
    accent: [1, 0.7, 0.6],
  },
  mint: {
    primary: [0.4, 1, 0.7],
    secondary: [0.5, 1, 0.8],
    accent: [0.6, 1, 0.9],
  },
  lavender: {
    primary: [0.7, 0.6, 1],
    secondary: [0.8, 0.7, 1],
    accent: [0.9, 0.8, 1],
  },
  rose: {
    primary: [1, 0.4, 0.7],
    secondary: [1, 0.5, 0.8],
    accent: [1, 0.6, 0.9],
  },
  peach: {
    primary: [1, 0.75, 0.6],
    secondary: [1, 0.8, 0.7],
    accent: [1, 0.9, 0.8],
  },
  cherry: {
    primary: [1, 0.1, 0.2],
    secondary: [1, 0.2, 0.3],
    accent: [1, 0.3, 0.4],
  },
  lime: {
    primary: [0.5, 1, 0],
    secondary: [0.6, 1, 0.1],
    accent: [0.7, 1, 0.2],
  },
  navy: {
    primary: [0, 0.1, 0.4],
    secondary: [0.1, 0.2, 0.5],
    accent: [0.2, 0.3, 0.6],
  },
  maroon: {
    primary: [0.5, 0, 0],
    secondary: [0.7, 0.1, 0.1],
    accent: [0.9, 0.2, 0.2],
  },
  olive: {
    primary: [0.5, 0.5, 0],
    secondary: [0.6, 0.6, 0.1],
    accent: [0.7, 0.7, 0.2],
  },
  teal: {
    primary: [0, 0.5, 0.5],
    secondary: [0.1, 0.6, 0.6],
    accent: [0.2, 0.7, 0.7],
  },
  cyan: { primary: [0, 1, 1], secondary: [0.2, 1, 1], accent: [0.4, 1, 1] },
  magenta: { primary: [1, 0, 1], secondary: [1, 0.2, 1], accent: [1, 0.4, 1] },
  indigo: {
    primary: [0.3, 0, 0.5],
    secondary: [0.4, 0.1, 0.6],
    accent: [0.5, 0.2, 0.7],
  },
  violet: {
    primary: [0.75, 0, 1],
    secondary: [0.8, 0.2, 1],
    accent: [0.9, 0.4, 1],
  },
  turquoise: {
    primary: [0.2, 0.8, 0.8],
    secondary: [0.3, 0.9, 0.9],
    accent: [0.4, 1, 1],
  },
  aquamarine: {
    primary: [0.5, 1, 0.85],
    secondary: [0.6, 1, 0.9],
    accent: [0.7, 1, 1],
  },
  khaki: {
    primary: [0.9, 0.9, 0.5],
    secondary: [1, 1, 0.6],
    accent: [1, 1, 0.7],
  },
  beige: {
    primary: [0.9, 0.8, 0.6],
    secondary: [0.95, 0.85, 0.7],
    accent: [1, 0.9, 0.8],
  },
  cream: { primary: [1, 1, 0.8], secondary: [1, 1, 0.85], accent: [1, 1, 0.9] },
  chocolate: {
    primary: [0.4, 0.25, 0.1],
    secondary: [0.5, 0.3, 0.15],
    accent: [0.6, 0.35, 0.2],
  },
  coffee: {
    primary: [0.5, 0.35, 0.25],
    secondary: [0.6, 0.4, 0.3],
    accent: [0.7, 0.45, 0.35],
  },
  sand: {
    primary: [0.8, 0.7, 0.5],
    secondary: [0.9, 0.75, 0.55],
    accent: [1, 0.8, 0.6],
  },
  rust: {
    primary: [0.8, 0.4, 0.1],
    secondary: [0.9, 0.5, 0.2],
    accent: [1, 0.6, 0.3],
  },
  terracotta: {
    primary: [0.9, 0.5, 0.2],
    secondary: [1, 0.6, 0.3],
    accent: [1, 0.7, 0.4],
  },
  clay: {
    primary: [0.8, 0.5, 0.4],
    secondary: [0.9, 0.6, 0.5],
    accent: [1, 0.7, 0.6],
  },
  slate: {
    primary: [0.4, 0.45, 0.5],
    secondary: [0.5, 0.55, 0.6],
    accent: [0.6, 0.65, 0.7],
  },
  graphite: {
    primary: [0.3, 0.3, 0.3],
    secondary: [0.4, 0.4, 0.4],
    accent: [0.5, 0.5, 0.5],
  },
  charcoal: {
    primary: [0.2, 0.2, 0.2],
    secondary: [0.3, 0.3, 0.3],
    accent: [0.4, 0.4, 0.4],
  },
  ivory: {
    primary: [1, 1, 0.9],
    secondary: [1, 1, 0.92],
    accent: [1, 1, 0.95],
  },
  pearl: {
    primary: [0.95, 0.95, 1],
    secondary: [0.97, 0.97, 1],
    accent: [1, 1, 1],
  },
  platinum: {
    primary: [0.8, 0.8, 0.85],
    secondary: [0.9, 0.9, 0.92],
    accent: [1, 1, 1],
  },
  chrome: {
    primary: [0.7, 0.7, 0.75],
    secondary: [0.85, 0.85, 0.9],
    accent: [1, 1, 1],
  },
  titanium: {
    primary: [0.6, 0.65, 0.7],
    secondary: [0.75, 0.8, 0.85],
    accent: [0.9, 0.95, 1],
  },
  steel: {
    primary: [0.5, 0.5, 0.55],
    secondary: [0.65, 0.65, 0.7],
    accent: [0.8, 0.8, 0.85],
  },
  iron: {
    primary: [0.35, 0.35, 0.35],
    secondary: [0.45, 0.45, 0.45],
    accent: [0.55, 0.55, 0.55],
  },
  "silver-blue": {
    primary: [0.6, 0.7, 0.85],
    secondary: [0.7, 0.8, 0.95],
    accent: [0.8, 0.9, 1],
  },
  "gold-white": {
    primary: [1, 0.9, 0.7],
    secondary: [1, 0.95, 0.8],
    accent: [1, 1, 0.9],
  },
  "copper-green": {
    primary: [0.5, 0.6, 0.3],
    secondary: [0.6, 0.7, 0.4],
    accent: [0.7, 0.8, 0.5],
  },
  "bronze-brown": {
    primary: [0.6, 0.4, 0.15],
    secondary: [0.7, 0.5, 0.2],
    accent: [0.8, 0.6, 0.25],
  },
  electric: {
    primary: [0.2, 1, 0.8],
    secondary: [0.4, 1, 0.9],
    accent: [0.6, 1, 1],
  },
  holographic: {
    primary: [1, 0, 0.7],
    secondary: [0, 1, 0.7],
    accent: [0.7, 0, 1],
  },
  "gradient-rgb": {
    primary: [1, 0, 0],
    secondary: [0, 1, 0],
    accent: [0, 0, 1],
  },
  "gradient-hsv": {
    primary: [1, 0, 0],
    secondary: [1, 1, 0],
    accent: [0, 1, 0],
  },
  candy: {
    primary: [1, 0.3, 0.6],
    secondary: [1, 0.6, 0.3],
    accent: [0.3, 0.6, 1],
  },
  pastel: {
    primary: [1, 0.7, 0.8],
    secondary: [0.8, 1, 0.8],
    accent: [0.8, 0.8, 1],
  },
  "neon-pink": {
    primary: [1, 0.1, 0.7],
    secondary: [1, 0.2, 0.8],
    accent: [1, 0.3, 0.9],
  },
  "neon-green": {
    primary: [0.2, 1, 0.1],
    secondary: [0.3, 1, 0.2],
    accent: [0.4, 1, 0.3],
  },
  "neon-blue": {
    primary: [0.1, 0.7, 1],
    secondary: [0.2, 0.8, 1],
    accent: [0.3, 0.9, 1],
  },
  "neon-purple": {
    primary: [0.8, 0.1, 1],
    secondary: [0.9, 0.2, 1],
    accent: [1, 0.3, 1],
  },
  "neon-orange": {
    primary: [1, 0.4, 0.1],
    secondary: [1, 0.5, 0.2],
    accent: [1, 0.6, 0.3],
  },
  "neon-cyan": {
    primary: [0.1, 1, 0.8],
    secondary: [0.2, 1, 0.9],
    accent: [0.3, 1, 1],
  },
  aurora: {
    primary: [0.2, 1, 0.5],
    secondary: [0.8, 1, 0.5],
    accent: [0.2, 0.5, 1],
  },
  "sunset-gradient": {
    primary: [1, 0.2, 0.1],
    secondary: [1, 0.7, 0.2],
    accent: [0.2, 0.1, 0.5],
  },
  "ocean-gradient": {
    primary: [0, 0.3, 0.7],
    secondary: [0, 0.7, 1],
    accent: [0.5, 1, 1],
  },
  "forest-gradient": {
    primary: [0.1, 0.3, 0.1],
    secondary: [0.3, 0.8, 0.3],
    accent: [0.8, 1, 0.2],
  },
  "fire-gradient": {
    primary: [0, 0, 0.3],
    secondary: [1, 0.4, 0],
    accent: [1, 1, 0],
  },
  ice: {
    primary: [0.7, 0.9, 1],
    secondary: [0.85, 0.95, 1],
    accent: [1, 1, 1],
  },
  lava: { primary: [0.5, 0, 0], secondary: [1, 0.5, 0], accent: [1, 1, 0] },
  plasma: { primary: [0, 0.5, 1], secondary: [1, 0, 0.5], accent: [1, 1, 0] },
  energy: {
    primary: [0.2, 0.8, 1],
    secondary: [0.8, 0.2, 1],
    accent: [1, 0.8, 0.2],
  },
  rainbow: {
    primary: [1, 0, 0],
    secondary: [0, 1, 0],
    accent: [0, 0, 1],
    quaternary: [1, 1, 0],
  },
  "rainbow-pastel": {
    primary: [1, 0.6, 0.6],
    secondary: [0.6, 1, 0.6],
    accent: [0.6, 0.6, 1],
  },
  "monochrome-blue": {
    primary: [0, 0.3, 0.7],
    secondary: [0.3, 0.6, 0.9],
    accent: [0.6, 0.8, 1],
  },
  "monochrome-red": {
    primary: [0.5, 0, 0],
    secondary: [0.8, 0.3, 0.3],
    accent: [1, 0.6, 0.6],
  },
  "monochrome-green": {
    primary: [0, 0.4, 0],
    secondary: [0.3, 0.7, 0.3],
    accent: [0.6, 1, 0.6],
  },
  "monochrome-purple": {
    primary: [0.3, 0, 0.5],
    secondary: [0.6, 0.3, 0.8],
    accent: [0.9, 0.6, 1],
  },
  "warm-metals": {
    primary: [1, 0.7, 0.3],
    secondary: [0.9, 0.5, 0.2],
    accent: [0.8, 0.4, 0.1],
  },
  "cool-metals": {
    primary: [0.5, 0.7, 0.9],
    secondary: [0.6, 0.8, 1],
    accent: [0.7, 0.9, 1],
  },
  "gem-stones": {
    primary: [0.8, 0.3, 0.8],
    secondary: [0.3, 0.8, 0.8],
    accent: [0.8, 0.8, 0.3],
  },
  nature: {
    primary: [0.4, 0.6, 0.2],
    secondary: [0.6, 0.8, 0.4],
    accent: [0.8, 1, 0.6],
  },
  space: {
    primary: [0.1, 0.1, 0.3],
    secondary: [0.5, 0.2, 0.7],
    accent: [0.9, 0.9, 1],
  },
  cyberpunk: {
    primary: [0, 1, 0.8],
    secondary: [1, 0.1, 0.8],
    accent: [0.9, 0, 0.9],
  },
  "retro-80s": {
    primary: [1, 0.1, 0.5],
    secondary: [0.1, 1, 0.8],
    accent: [0.9, 0.9, 0.1],
  },
  synthwave: {
    primary: [1, 0, 0.5],
    secondary: [0, 0.8, 1],
    accent: [1, 0.9, 0],
  },
  "dark-matter": {
    primary: [0.1, 0.1, 0.15],
    secondary: [0.3, 0.2, 0.4],
    accent: [0.6, 0.4, 0.8],
  },
  "light-matter": {
    primary: [0.9, 0.9, 0.95],
    secondary: [0.8, 0.9, 1],
    accent: [0.7, 0.8, 1],
  },
  quantum: {
    primary: [0, 1, 0.5],
    secondary: [0.5, 0, 1],
    accent: [1, 0.5, 0],
  },
  thermal: { primary: [0, 0, 1], secondary: [0, 1, 0], accent: [1, 0, 0] },
  infrared: {
    primary: [0.3, 0, 0],
    secondary: [1, 0.3, 0],
    accent: [1, 0.8, 0.3],
  },
  ultraviolet: {
    primary: [0.8, 0, 1],
    secondary: [1, 0.5, 1],
    accent: [1, 1, 1],
  },
  "rgb-split": { primary: [1, 0, 0], secondary: [0, 1, 0], accent: [0, 0, 1] },
  cmyk: { primary: [0, 1, 1], secondary: [1, 0, 1], accent: [1, 1, 0] },
  "hsv-wheel": { primary: [1, 0, 0], secondary: [0, 1, 0], accent: [0, 0, 1] },
  "color-spectrum": {
    primary: [1, 0, 0.5],
    secondary: [0.5, 0, 1],
    accent: [0, 1, 0.5],
  },
};

const ParticleWave = ({
  width = 30,
  height = 15,
  segmentsX = 150,
  segmentsY = 80,
  shape = "wave" as ShapeType,
  materialTheme = "neon" as MaterialTheme,
}) => {
  const mesh = useRef<THREE.Points>(null);
  const { mouse, viewport } = useThree();
  const mouseRef = useRef(new THREE.Vector2(0, 0));

  const phases = useMemo(() => {
    const arr = new Float32Array(segmentsX * segmentsY);
    for (let i = 0; i < arr.length; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, [segmentsX, segmentsY]);

  // One reusable context object for the modular shape library (see ../shapes).
  const shapeCtx = useMemo<ShapeContext>(
    () => ({
      i: 0,
      j: 0,
      u: 0,
      v: 0,
      idx: 0,
      count: segmentsX * segmentsY,
      x0: 0,
      z0: 0,
      time: 0,
      phase: 0,
      width,
      height,
      segX: segmentsX,
      segY: segmentsY,
    }),
    [width, height, segmentsX, segmentsY]
  );

  const originalPositions = useMemo(() => {
    const arr = new Float32Array(segmentsX * segmentsY * 3);
    let ptr = 0;
    for (let i = 0; i < segmentsX; i++) {
      for (let j = 0; j < segmentsY; j++) {
        const x = (i / segmentsX - 0.5) * width;
        const y = 0;
        const z = (j / segmentsY - 0.5) * height;
        arr[ptr++] = x;
        arr[ptr++] = y;
        arr[ptr++] = z;
      }
    }
    return arr;
  }, [width, height, segmentsX, segmentsY]);

  const geometry = useMemo(() => {
    const positions = new Float32Array(segmentsX * segmentsY * 3);
    const colors = new Float32Array(segmentsX * segmentsY * 3);
    let ptr = 0;

    const scheme = colorSchemes[materialTheme];
    const [pr, pg, pb] = scheme.primary;

    for (let i = 0; i < segmentsX; i++) {
      for (let j = 0; j < segmentsY; j++) {
        positions[ptr] = originalPositions[ptr];
        positions[ptr + 1] = originalPositions[ptr + 1];
        positions[ptr + 2] = originalPositions[ptr + 2];

        colors[ptr] = pr;
        colors[ptr + 1] = pg;
        colors[ptr + 2] = pb;
        ptr += 3;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [segmentsX, segmentsY, originalPositions, materialTheme]);

  const getShapePosition = (
    i: number,
    j: number,
    time: number
  ): [number, number, number] => {
    const x0 = (i / segmentsX - 0.5) * width;
    const z0 = (j / segmentsY - 0.5) * height;
    const phase = phases[i * segmentsY + j];
    const u = i / segmentsX;
    const v = j / segmentsY;

    switch (shape) {
      case "plane":
        return [x0, 0, z0];
      case "wave":
        return [
          x0,
          Math.sin(x0 * 0.5 + time * 1.5 + phase) * 0.5 +
            Math.cos(z0 * 0.5 + time * 1.2 + phase) * 0.3,
          z0,
        ];
      case "sphere": {
        const radius = Math.min(width, height) / 2;
        const theta = u * Math.PI;
        const phi = v * 2 * Math.PI;
        return [
          radius * Math.sin(theta) * Math.cos(phi),
          radius * Math.cos(theta),
          radius * Math.sin(theta) * Math.sin(phi),
        ];
      }
      case "cone": {
        const radius = Math.min(width, height) / 2;
        const theta = u * 2 * Math.PI;
        const y = v * 10 - 5;
        return [
          radius * (1 - v) * Math.cos(theta),
          y,
          radius * (1 - v) * Math.sin(theta),
        ];
      }
      case "torus": {
        const R = 5,
          r = 2;
        const theta = u * 2 * Math.PI;
        const phi = v * 2 * Math.PI;
        return [
          (R + r * Math.cos(phi)) * Math.cos(theta),
          r * Math.sin(phi),
          (R + r * Math.cos(phi)) * Math.sin(theta),
        ];
      }
      case "heart": {
        const t = u * Math.PI * 2;
        const s = v * 2 - 1;
        return [
          16 * Math.pow(Math.sin(t), 3) * s * 0.05,
          (13 * Math.cos(t) -
            5 * Math.cos(2 * t) -
            2 * Math.cos(3 * t) -
            Math.cos(4 * t)) *
            s *
            0.05,
          0,
        ];
      }
      case "spiral": {
        const angle = u * Math.PI * 4 + time;
        const radius = v * 5;
        return [
          Math.cos(angle) * radius,
          v * 5 - 2.5,
          Math.sin(angle) * radius,
        ];
      }
      case "sin":
        return [
          x0,
          Math.sin(x0 * 1.5 + time + phase) * Math.cos(z0 * 1.5 + phase),
          z0,
        ];
      case "cloud":
        return [
          x0 + Math.sin(j + time) * 0.5,
          Math.cos(i + time) * 0.5,
          z0 + Math.sin(i + j + time) * 0.5,
        ];
      case "random":
        return [
          (Math.random() - 0.5) * width,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * height,
        ];
      case "pyramid":
        return [
          Math.cos(u * Math.PI * 2) * (1 - v) * 5,
          v * 5 - 2.5,
          Math.sin(u * Math.PI * 2) * (1 - v) * 5,
        ];
      case "cylinder":
        return [
          3 * Math.cos(u * Math.PI * 2),
          v * 10 - 5,
          3 * Math.sin(u * Math.PI * 2),
        ];
      case "ellipsoid":
        return [
          5 * Math.sin(u * Math.PI) * Math.cos(v * 2 * Math.PI),
          3 * Math.cos(u * Math.PI),
          4 * Math.sin(u * Math.PI) * Math.sin(v * 2 * Math.PI),
        ];
      case "hyperbola": {
        const t = u * 4 - 2;
        return [
          3 * Math.cosh(t) * Math.cos(v * Math.PI * 2) * 0.1,
          2 * Math.sinh(t) * 0.1,
          3 * Math.cosh(t) * Math.sin(v * Math.PI * 2) * 0.1,
        ];
      }
      case "lissajous":
        return [
          5 * Math.sin(3 * u * Math.PI * 2 + Math.PI / 2),
          5 * Math.sin(2 * v * Math.PI * 2),
          0,
        ];
      case "star":
        return [
          5 * Math.pow(v, 0.5) * Math.cos(u * Math.PI * 10),
          0,
          5 * Math.pow(v, 0.5) * Math.sin(u * Math.PI * 10),
        ];
      case "mobius": {
        const R = 3,
          w = 1,
          t = u * 2 * Math.PI;
        return [
          (R + w * Math.cos(t / 2) * Math.sin(v * 2 * Math.PI)) * Math.cos(t),
          w * Math.sin(t / 2) * Math.sin(v * 2 * Math.PI),
          (R + w * Math.cos(t / 2) * Math.sin(v * 2 * Math.PI)) * Math.sin(t),
        ];
      }
      case "klein": {
        const t = u * 2 * Math.PI,
          s = v * 2 * Math.PI;
        return [
          Math.cos(t) *
            (Math.cos(t / 2) * (Math.sqrt(2) + Math.cos(s)) +
              Math.sin(t / 2) * Math.sin(s) * Math.cos(s)),
          Math.sin(t) *
            (Math.cos(t / 2) * (Math.sqrt(2) + Math.cos(s)) +
              Math.sin(t / 2) * Math.sin(s) * Math.cos(s)),
          -Math.sin(t / 2) * (Math.sqrt(2) + Math.cos(s)) +
            Math.cos(t / 2) * Math.sin(s) * Math.cos(s),
        ];
      }
      case "ring":
        return [
          5 * Math.cos(u * 2 * Math.PI),
          0,
          5 * Math.sin(u * 2 * Math.PI),
        ];
      case "helix":
        return [
          3 * Math.cos(u * 4 * Math.PI),
          v * 5 - 2.5,
          3 * Math.sin(u * 4 * Math.PI),
        ];
      case "doubleHelix":
        return [
          2 * Math.cos(u * 8 * Math.PI),
          v * 5 - 2.5,
          2 * Math.sin(u * 8 * Math.PI) * (j % 2 === 0 ? 1 : -1),
        ];
      case "figure8":
        return [
          3 * Math.sin(u * 2 * Math.PI),
          3 * Math.sin(u * 2 * Math.PI) * Math.cos(u * 2 * Math.PI),
          0,
        ];
      case "parabola":
        return [x0, x0 * x0 * 0.05, z0];
      case "sineWave":
        return [x0, Math.sin(x0 + time) * 2, z0];
      case "cosineWave":
        return [x0, Math.cos(x0 + time) * 2, z0];
      case "sawtooth":
        return [x0, (x0 % 1) * 2, z0];
      case "triangleWave":
        return [x0, Math.abs((x0 % 2) - 1) * 2, z0];
      case "twistWave":
        return [
          x0 * Math.cos(z0 + time),
          Math.sin(x0 + time),
          z0 * Math.sin(x0 + time),
        ];
      case "vortex": {
        const r = Math.sqrt(x0 * x0 + z0 * z0);
        const theta = Math.atan2(z0, x0) + time;
        return [
          r * Math.cos(theta),
          Math.sin(r * 2 + time),
          r * Math.sin(theta),
        ];
      }
      case "cloudDense":
        return [
          x0 + (Math.random() - 0.5) * 0.5,
          Math.random(),
          z0 + (Math.random() - 0.5) * 0.5,
        ];
      case "smoke":
        return [
          x0 + Math.sin(time + i) * 0.5,
          Math.sin(time + j) * 0.3,
          z0 + Math.cos(time + j) * 0.5,
        ];
      case "dust":
        return [
          x0 + Math.random() * 0.2,
          Math.random() * 0.5,
          z0 + Math.random() * 0.2,
        ];
      case "ribbon":
        return [x0, Math.sin(x0 + time) * 0.5, z0 + Math.cos(z0 + time) * 0.5];
      case "wave2D":
        return [x0, Math.sin(x0 * 1.5 + time) * 1, z0];
      case "wave3D":
        return [x0, Math.sin(x0 * 1.5 + time) * Math.cos(z0 * 1.5 + time), z0];
      case "ripple": {
        const d = Math.sqrt(x0 * x0 + z0 * z0);
        return [x0, Math.sin(d * 2 - time) * 1, z0];
      }
      case "grid":
        return [x0, 0, z0];
      case "checker":
        return [x0, ((i + j) % 2) * 0.5, z0];
      case "circle": {
        const r = Math.sqrt(u) * 5;
        const theta = v * 2 * Math.PI;
        return [r * Math.cos(theta), 0, r * Math.sin(theta)];
      }
      case "ellipse": {
        const rx = 5,
          rz = 3;
        const theta = v * 2 * Math.PI;
        return [rx * Math.cos(theta), 0, rz * Math.sin(theta)];
      }
      case "petals": {
        const r = Math.sin(v * Math.PI * 3) * 5;
        const theta = u * 2 * Math.PI;
        return [
          r * Math.cos(theta),
          Math.sin(v * Math.PI),
          r * Math.sin(theta),
        ];
      }
      case "flower": {
        const r = Math.sin(v * Math.PI * 4) * 4;
        const theta = u * 2 * Math.PI;
        return [
          r * Math.cos(theta),
          Math.cos(v * Math.PI),
          r * Math.sin(theta),
        ];
      }
      case "tree":
        return [x0, Math.abs(z0) * 0.3, z0];
      case "branch":
        return [x0 * 0.5, z0 * 0.5, Math.sin(i + time) * 0.5];
      case "crown":
        return [
          Math.sin(u * 2 * Math.PI) * 3,
          v * 1,
          Math.cos(u * 2 * Math.PI) * 3,
        ];
      case "fan":
        return [Math.cos(u * Math.PI) * 5, v * 2, z0];
      case "spiral2": {
        const angle2 = u * 6 * Math.PI + time;
        const radius2 = v * 5;
        return [Math.cos(angle2) * radius2, v * 2, Math.sin(angle2) * radius2];
      }
      case "helix2": {
        const angleH = u * 4 * Math.PI,
          rH = 2;
        return [rH * Math.cos(angleH), v * 5 - 2.5, rH * Math.sin(angleH)];
      }
      case "particleStorm":
        return [
          x0 + Math.sin(i + time) * 0.5,
          Math.sin(j + time) * 0.5,
          z0 + Math.cos(i + j + time) * 0.5,
        ];
      case "randomScatter":
        return [
          (Math.random() - 0.5) * width,
          Math.random() * 2,
          (Math.random() - 0.5) * height,
        ];
      case "nebula":
        return [
          x0 + Math.sin(time + i * 0.1) * 0.5,
          Math.sin(time + j * 0.1) * 0.5,
          z0 + Math.cos(time + i * 0.1) * 0.5,
        ];
      case "galaxy": {
        const r = Math.sqrt(u) * 5;
        const theta = v * 4 * Math.PI + time;
        return [r * Math.cos(theta), v * 1, r * Math.sin(theta)];
      }
      case "tornado": {
        const radiusT = 3 - v * 2.5;
        const angleT = u * 6 * Math.PI + time * 2;
        const y = v * 5;
        return [radiusT * Math.cos(angleT), y, radiusT * Math.sin(angleT)];
      }
      case "pulse":
        return [x0, Math.sin(time * 5 - i * 0.1) * 2, z0];
      default: {
        const extra = (extraShapes as Record<string, ShapeFn | undefined>)[
          shape
        ];
        if (!extra) return [x0, 0, z0];
        shapeCtx.i = i;
        shapeCtx.j = j;
        shapeCtx.u = u;
        shapeCtx.v = v;
        shapeCtx.idx = i * segmentsY + j;
        shapeCtx.x0 = x0;
        shapeCtx.z0 = z0;
        shapeCtx.time = time;
        shapeCtx.phase = phase;
        return extra(shapeCtx);
      }
    }
  };

  const getColorForHeight = (h: number): [number, number, number] => {
    const scheme = colorSchemes[materialTheme];
    const [pr, pg, pb] = scheme.primary;
    const [sr, sg, sb] = scheme.secondary;
    const [ar, ag, ab] = scheme.accent;

    if (materialTheme.includes("gradient")) {
      // Smooth gradient between colors
      if (h < 0.5) {
        const t = h * 2;
        return [pr + (sr - pr) * t, pg + (sg - pg) * t, pb + (sb - pb) * t];
      } else {
        const t = (h - 0.5) * 2;
        return [sr + (ar - sr) * t, sg + (ag - sg) * t, sb + (ab - sb) * t];
      }
    } else if (materialTheme === "thermal") {
      // Blue to green to red
      if (h < 0.33) {
        const t = h / 0.33;
        return [0, 0 + 1 * t, 1 + (0 - 1) * t];
      } else if (h < 0.66) {
        const t = (h - 0.33) / 0.33;
        return [0 + 1 * t, 1, 0 + (0 - 0) * t];
      } else {
        const t = (h - 0.66) / 0.34;
        return [1, 1 + (0 - 1) * t, 0];
      }
    } else if (materialTheme === "rainbow" || materialTheme === "hsv-wheel") {
      // Rainbow spectrum
      const hue = h * 6;
      const x = 1 - Math.abs((hue % 2) - 1);
      if (hue < 1) return [1, x, 0];
      if (hue < 2) return [x, 1, 0];
      if (hue < 3) return [0, 1, x];
      if (hue < 4) return [0, x, 1];
      if (hue < 5) return [x, 0, 1];
      return [1, 0, x];
    } else if (materialTheme.includes("monochrome")) {
      return [pr + h * (1 - pr), pg + h * (1 - pg), pb + h * (1 - pb)];
    } else {
      // Standard gradient
      return [pr + h * (ar - pr), pg + h * (ag - pg), pb + h * (ab - pb)];
    }
  };

  useFrame((state) => {
    if (!mesh.current) return;

    mouseRef.current.x += (mouse.x - mouseRef.current.x) * 0.1;
    mouseRef.current.y += (mouse.y - mouseRef.current.y) * 0.1;

    const positions = mesh.current.geometry.attributes.position
      .array as Float32Array;
    const colors = mesh.current.geometry.attributes.color.array as Float32Array;
    const time = state.clock.getElapsedTime();

    const mouseX = mouseRef.current.x * viewport.width * 0.5;
    const mouseZ = mouseRef.current.y * viewport.height * 0.5;

    let ptr = 0;
    for (let i = 0; i < segmentsX; i++) {
      for (let j = 0; j < segmentsY; j++) {
        const [tx, ty, tz] = getShapePosition(i, j, time);

        const dx = mouseX - tx;
        const dz = mouseZ - tz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const influence = Math.exp(-dist * 0.12) * 3.5;

        positions[ptr] += (tx + influence - positions[ptr]) * 0.1;
        positions[ptr + 1] += (ty + influence - positions[ptr + 1]) * 0.1;
        positions[ptr + 2] += (tz - positions[ptr + 2]) * 0.1;

        const h = THREE.MathUtils.clamp((positions[ptr + 1] + 5) / 10, 0, 1);
        const [r, g, b] = getColorForHeight(h);

        colors[ptr] = r;
        colors[ptr + 1] = g;
        colors[ptr + 2] = b;

        ptr += 3;
      }
    }

    mesh.current.geometry.attributes.position.needsUpdate = true;
    mesh.current.geometry.attributes.color.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry attach="geometry" {...geometry} />
      <pointsMaterial
        vertexColors
        size={0.07}
        sizeAttenuation
        depthWrite={false}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const shapes: ShapeType[] = [
  "plane",
  "wave",
  "sphere",
  "cone",
  "torus",
  "heart",
  "spiral",
  "sin",
  "cloud",
  "random",
  "pyramid",
  "cylinder",
  "ellipsoid",
  "hyperbola",
  "lissajous",
  "star",
  "mobius",
  "klein",
  "ring",
  "helix",
  "doubleHelix",
  "figure8",
  "parabola",
  "sineWave",
  "cosineWave",
  "sawtooth",
  "triangleWave",
  "twistWave",
  "vortex",
  "cloudDense",
  "smoke",
  "dust",
  "ribbon",
  "wave2D",
  "wave3D",
  "ripple",
  "grid",
  "checker",
  "circle",
  "ellipse",
  "petals",
  "flower",
  "tree",
  "branch",
  "crown",
  "fan",
  "spiral2",
  "helix2",
  "particleStorm",
  "randomScatter",
  "nebula",
  "galaxy",
  "tornado",
  "pulse",
  ...EXTRA_SHAPE_NAMES,
];

const themes = Object.keys(colorSchemes) as MaterialTheme[];

export default function SantaSkyWave() {
  const [shapeIndex, setShapeIndex] = useState(0);
  const [themeIndex, setThemeIndex] = useState(0);

  const changeShape = () => setShapeIndex((prev) => (prev + 1) % shapes.length);
  const changeTheme = () => setThemeIndex((prev) => (prev + 1) % themes.length);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <Canvas camera={{ position: [0, 5, 20], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <ParticleWave
          shape={shapes[shapeIndex]}
          materialTheme={themes[themeIndex]}
          width={30}
          height={15}
          segmentsX={120}
          segmentsY={70}
        />
        <OrbitControls />
      </Canvas>
      <div className="absolute top-5 right-5 z-10 flex gap-3">
        <button
          onClick={changeShape}
          className="px-4 py-2 bg-white text-black rounded-md font-bold hover:bg-gray-200 transition"
        >
          Change Shape
        </button>
        <button
          onClick={changeTheme}
          className="px-4 py-2 bg-yellow-500 text-black rounded-md font-bold hover:bg-yellow-400 transition"
        >
          Change Theme
        </button>
      </div>
      <div className="absolute bottom-5 left-5 text-white z-10 text-sm">
        <p>
          Shape: <span className="font-bold">{shapes[shapeIndex]}</span>
        </p>
        <p>
          Theme: <span className="font-bold">{themes[themeIndex]}</span>
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Shapes: {shapes.length} | Themes: {themes.length}
        </p>
      </div>
    </div>
  );
}
