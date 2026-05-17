// Pixel-art crab sprite — a direct port of Marcio Granzotto's clawd-tank
// `clawd-static-base.svg` (MIT). The SVG uses rect-per-pixel on a 15×16
// grid; we materialize that grid into a 2D color array and pose it with
// small per-frame deltas (eye drift, arm bob, leg cycle).
//
// Rendered via unicode half-blocks (▀) in Crab.tsx: every two pixel rows
// compress to one character cell with fg=top color, bg=bottom color.
//
// Credit: github.com/marciogranzotto/clawd-tank (MIT)

import type { CrabMood } from '../../core/Aggregator';

export const SPRITE_W = 15;
export const SPRITE_H = 16;

/** A 2D pixel grid; null = transparent. */
export type PixelGrid = Array<Array<string | null>>;

/** Color palette per mood — body + eye + accent. */
interface Palette {
  body: string;
  bodyDark: string;
  eyes: string;
  shadow: string;
  particle: string;
}

const PALETTES: Record<CrabMood, Palette> = {
  chill: {
    body: '#DE886D',
    bodyDark: '#A6624D',
    eyes: '#0a0d18',
    shadow: '#0a0d18',
    particle: '#5af0ff',
  },
  focused: {
    body: '#E5A95D',
    bodyDark: '#B07840',
    eyes: '#0a0d18',
    shadow: '#0a0d18',
    particle: '#ffd700',
  },
  cooking: {
    body: '#E67050',
    bodyDark: '#A04830',
    eyes: '#ffd700',
    shadow: '#0a0d18',
    particle: '#ffd700',
  },
  burning: {
    body: '#C03030',
    bodyDark: '#7d1a1a',
    eyes: '#ffe066',
    shadow: '#0a0d18',
    particle: '#ff5a6e',
  },
};

/** One frame of motion — small deltas applied to the static base pose. */
interface Pose {
  /** Whole-crab horizontal offset (walking shift). */
  bodyDx?: number;
  /** Eye horizontal offset within socket (-1 left, 0 center, +1 right). */
  eyeDx?: number;
  /** Eye vertical compression (0 normal, 1 = squint/blink to a line). */
  eyeSquint?: number;
  /** Left/right arm vertical bob. */
  leftArmDy?: number;
  rightArmDy?: number;
  /** Which legs are raised this frame — bitmask over [outerL, innerL, innerR, outerR]. */
  legPattern?: number;
}

const BLANK_GRID = (): PixelGrid =>
  Array.from({ length: SPRITE_H }, () => Array<string | null>(SPRITE_W).fill(null));

function paintRect(g: PixelGrid, x: number, y: number, w: number, h: number, color: string): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || px >= SPRITE_W || py < 0 || py >= SPRITE_H) continue;
      const row = g[py];
      if (row) row[px] = color;
    }
  }
}

/** Build the full grid for a given pose + palette. */
export function buildGrid(pose: Pose, palette: Palette): PixelGrid {
  const g = BLANK_GRID();
  const dx = pose.bodyDx ?? 0;

  // Shadow — sits under everything, slightly offset by walk shift.
  paintRect(g, 3 + dx, 15, 9, 1, palette.shadow);

  // Torso (the big body block).
  paintRect(g, 2 + dx, 6, 11, 7, palette.body);

  // Subtle body-shade strip at the bottom of the torso for depth.
  paintRect(g, 2 + dx, 12, 11, 1, palette.bodyDark);

  // Arms.
  paintRect(g, 0 + dx, 9 + (pose.leftArmDy ?? 0), 2, 2, palette.body);
  paintRect(g, 13 + dx, 9 + (pose.rightArmDy ?? 0), 2, 2, palette.body);

  // Eyes (1×2 each by default). Squint flattens to 1×1.
  const eyeH = pose.eyeSquint ? 1 : 2;
  const eyeY = pose.eyeSquint ? 9 : 8;
  const ex = pose.eyeDx ?? 0;
  paintRect(g, 4 + dx + ex, eyeY, 1, eyeH, palette.eyes);
  paintRect(g, 10 + dx + ex, eyeY, 1, eyeH, palette.eyes);

  // Legs — 4 small posts under the torso; raised legs are 1px taller.
  const pat = pose.legPattern ?? 0;
  const legPositions = [3, 5, 9, 11];
  for (let i = 0; i < 4; i++) {
    const raised = (pat >> i) & 1;
    const baseX = (legPositions[i] ?? 0) + dx;
    const h = raised ? 1 : 2;
    paintRect(g, baseX, 13, 1, h, palette.body);
  }

  return g;
}

/** Sequence of poses per mood — drives the walk cycle. */
const MOOD_POSES: Record<CrabMood, Pose[]> = {
  // Chill: gentle 4-step shuffle, eyes scan
  chill: [
    { bodyDx: 0, eyeDx: 0, legPattern: 0b0101, leftArmDy: 0, rightArmDy: 0 },
    { bodyDx: 0, eyeDx: 0, legPattern: 0b1010, leftArmDy: -1, rightArmDy: 0 },
    { bodyDx: 0, eyeDx: 1, legPattern: 0b0101, leftArmDy: 0, rightArmDy: 0 },
    { bodyDx: 0, eyeDx: -1, legPattern: 0b1010, leftArmDy: 0, rightArmDy: -1 },
  ],
  // Focused: tight, eyes locked, claws "typing" — arms bob fast
  focused: [
    { eyeDx: 0, legPattern: 0b0101, leftArmDy: 0, rightArmDy: -1 },
    { eyeDx: 0, legPattern: 0b1010, leftArmDy: -1, rightArmDy: 0 },
    { eyeDx: 0, legPattern: 0b0101, leftArmDy: 0, rightArmDy: -1 },
    { eyeDx: 0, legPattern: 0b1010, leftArmDy: -1, rightArmDy: 0 },
  ],
  // Cooking: hammer-strike, body squats, big leg pattern shifts
  cooking: [
    { eyeDx: 0, legPattern: 0b0101, leftArmDy: -1, rightArmDy: -1 },
    { eyeDx: 0, legPattern: 0b1111, leftArmDy: 1, rightArmDy: 1 },
    { eyeDx: 0, legPattern: 0b1010, leftArmDy: -1, rightArmDy: -1 },
    { eyeDx: 0, legPattern: 0b1111, leftArmDy: 1, rightArmDy: 1 },
  ],
  // Burning: jittery, body offset randomly, eyes wide
  burning: [
    { bodyDx: 0, eyeDx: 1, legPattern: 0b0110, leftArmDy: -1, rightArmDy: 0 },
    { bodyDx: 1, eyeDx: -1, legPattern: 0b1001, leftArmDy: 0, rightArmDy: -1 },
    { bodyDx: 0, eyeDx: -1, legPattern: 0b0110, leftArmDy: 1, rightArmDy: -1 },
    { bodyDx: -1, eyeDx: 1, legPattern: 0b1001, leftArmDy: -1, rightArmDy: 1 },
  ],
};

/** Per-mood pose count, used by the renderer for cycling. */
export function poseCount(mood: CrabMood): number {
  return MOOD_POSES[mood].length;
}

/** Get the grid for the (mood, frameIndex) pair. */
export function gridFor(mood: CrabMood, frameIdx: number): PixelGrid {
  const poses = MOOD_POSES[mood];
  const pose = poses[frameIdx % poses.length] ?? poses[0] ?? {};
  return buildGrid(pose, PALETTES[mood]);
}

/** Particle accent (used for the row above the crab). */
export function particleColor(mood: CrabMood): string {
  return PALETTES[mood].particle;
}

/** Per-mood walk tempo, ms per frame. */
export const MOOD_TEMPO: Record<CrabMood, number> = {
  burning: 180,
  cooking: 260,
  focused: 340,
  chill: 540,
};
