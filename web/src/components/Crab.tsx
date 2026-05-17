import { motion } from 'framer-motion';
import type { CrabMood } from '../lib/types';

// Animated pixel-art crab. Drawn as SVG <rect>s on a 32x32 grid so it stays
// crisp at any zoom and reacts to mood without sprite sheets. Eye/mouth glyphs
// switch per mood; body color shifts with intensity.

interface Props {
  mood: CrabMood;
  scale?: number;
}

const MOOD_PALETTE: Record<CrabMood, { body: string; light: string; dark: string }> = {
  chill: { body: '#3bc6d6', light: '#65d6f5', dark: '#2b88a0' },
  focused: { body: '#d6c93b', light: '#f5e565', dark: '#a0972b' },
  cooking: { body: '#d6713b', light: '#f59465', dark: '#a04f2b' },
  burning: { body: '#d63b3b', light: '#ff6565', dark: '#a02b2b' },
};

// Per-pixel eye/mouth definition — quick swappable face per mood.
const FACES: Record<CrabMood, { eyes: Array<{ x: number; y: number; c: string }>; mouth: { x: number; y: number; w: number; h: number } }> = {
  chill: {
    eyes: [
      { x: 12, y: 12, c: '#fff' },
      { x: 13, y: 13, c: '#0a0d18' },
      { x: 18, y: 12, c: '#fff' },
      { x: 19, y: 13, c: '#0a0d18' },
    ],
    mouth: { x: 14, y: 16, w: 4, h: 1 },
  },
  focused: {
    eyes: [
      { x: 12, y: 12, c: '#fff' },
      { x: 13, y: 12, c: '#0a0d18' },
      { x: 18, y: 12, c: '#fff' },
      { x: 19, y: 12, c: '#0a0d18' },
    ],
    mouth: { x: 13, y: 16, w: 6, h: 1 },
  },
  cooking: {
    eyes: [
      { x: 12, y: 12, c: '#ffd700' },
      { x: 13, y: 13, c: '#0a0d18' },
      { x: 18, y: 12, c: '#ffd700' },
      { x: 19, y: 13, c: '#0a0d18' },
    ],
    mouth: { x: 13, y: 15, w: 6, h: 2 },
  },
  burning: {
    eyes: [
      { x: 12, y: 12, c: '#ff5a6e' },
      { x: 13, y: 13, c: '#fff' },
      { x: 18, y: 12, c: '#ff5a6e' },
      { x: 19, y: 13, c: '#fff' },
    ],
    mouth: { x: 13, y: 15, w: 6, h: 2 },
  },
};

// Frame-by-frame leg positions for the walk cycle — alternates legs up/down.
// Two frames is the minimum that reads as animation.
const LEGS_FRAMES = [
  [
    { x: 8, y: 18, h: 2 },
    { x: 12, y: 18, h: 2 },
    { x: 18, y: 18, h: 2 },
    { x: 22, y: 18, h: 2 },
    { x: 7, y: 20, h: 2 },
    { x: 11, y: 20, h: 2 },
    { x: 19, y: 20, h: 2 },
    { x: 23, y: 20, h: 2 },
  ],
  [
    { x: 8, y: 18, h: 3 },
    { x: 12, y: 19, h: 2 },
    { x: 18, y: 19, h: 2 },
    { x: 22, y: 18, h: 3 },
    { x: 7, y: 21, h: 1 },
    { x: 11, y: 21, h: 1 },
    { x: 19, y: 21, h: 1 },
    { x: 23, y: 21, h: 1 },
  ],
];

interface CrabSvgProps {
  mood: CrabMood;
  frame: number;
  blinking: boolean;
}

function CrabSvg({ mood, frame, blinking }: CrabSvgProps): JSX.Element {
  const p = MOOD_PALETTE[mood];
  const f = FACES[mood];
  const legs = LEGS_FRAMES[frame % LEGS_FRAMES.length] ?? LEGS_FRAMES[0] ?? [];
  return (
    <svg viewBox="0 0 32 32" shapeRendering="crispEdges" style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}>
      {/* shell */}
      <rect x="8" y="10" width="16" height="8" fill={p.body} />
      <rect x="6" y="12" width="2" height="4" fill={p.body} />
      <rect x="24" y="12" width="2" height="4" fill={p.body} />
      <rect x="10" y="8" width="12" height="2" fill={p.body} />
      <rect x="10" y="10" width="2" height="2" fill={p.light} />
      <rect x="20" y="10" width="2" height="2" fill={p.light} />

      {/* claws — slight vertical bob with the walk frame */}
      <g transform={`translate(0 ${frame === 1 ? -0.5 : 0})`}>
        <rect x="2" y="14" width="4" height="2" fill={p.body} />
        <rect x="0" y="12" width="2" height="2" fill={p.body} />
        <rect x="0" y="16" width="2" height="2" fill={p.body} />
      </g>
      <g transform={`translate(0 ${frame === 0 ? -0.5 : 0})`}>
        <rect x="26" y="14" width="4" height="2" fill={p.body} />
        <rect x="30" y="12" width="2" height="2" fill={p.body} />
        <rect x="30" y="16" width="2" height="2" fill={p.body} />
      </g>

      {/* eyes — collapse to a line on blink */}
      {blinking ? (
        <>
          <rect x="12" y="13" width="2" height="1" fill={p.dark} />
          <rect x="18" y="13" width="2" height="1" fill={p.dark} />
        </>
      ) : (
        f.eyes.map((e, i) => (
          <rect key={i} x={e.x} y={e.y} width="1" height="1" fill={e.c} />
        ))
      )}
      {/* second-pixel eye (whites of the eye for non-blink) */}
      {!blinking ? <rect x={13} y={13} width="0" height="0" /> : null}

      {/* mouth */}
      <rect x={f.mouth.x} y={f.mouth.y} width={f.mouth.w} height={f.mouth.h} fill="#0a0d18" />

      {/* legs */}
      {legs.map((l, i) => (
        <rect key={`leg${i}`} x={l.x} y={l.y} width="2" height={l.h} fill={i < 4 ? p.body : p.dark} />
      ))}
    </svg>
  );
}

export function Crab({ mood, scale = 6 }: Props): JSX.Element {
  // Two-frame walk, breathing bob, occasional blink.
  return (
    <motion.div
      style={{
        width: 32 * scale,
        height: 32 * scale,
        position: 'relative',
        imageRendering: 'pixelated',
      }}
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <CrabFrames mood={mood} />
    </motion.div>
  );
}

// Inner component that drives the frame state independently so the outer
// breathing motion stays continuous when frame swaps.
function CrabFrames({ mood }: { mood: CrabMood }): JSX.Element {
  // Use motion's keyframe animation on a CSS variable to drive the frame swap
  // without re-rendering — but simpler: state via an interval is fine here.
  return <CrabAnimator mood={mood} />;
}

function CrabAnimator({ mood }: { mood: CrabMood }): JSX.Element {
  return (
    <motion.div
      style={{ width: '100%', height: '100%' }}
      animate={{ rotate: [0, -1.5, 0, 1.5, 0] }}
      transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <CrabTicker mood={mood} />
    </motion.div>
  );
}

// Drives frame and blink state with simple intervals.
import { useEffect, useState } from 'react';

function CrabTicker({ mood }: { mood: CrabMood }): JSX.Element {
  const [frame, setFrame] = useState(0);
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    // Walk cycle: speed depends on mood — burning crabs scuttle.
    const walkMs = mood === 'burning' ? 180 : mood === 'cooking' ? 280 : mood === 'focused' ? 420 : 720;
    const w = setInterval(() => setFrame((f) => 1 - f), walkMs);
    // Blink every 3-6s.
    const b = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 140);
    }, 3000 + Math.random() * 3000);
    return () => {
      clearInterval(w);
      clearInterval(b);
    };
  }, [mood]);

  return <CrabSvg mood={mood} frame={frame} blinking={blinking} />;
}
