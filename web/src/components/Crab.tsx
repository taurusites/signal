import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { CrabMood } from '../lib/types';

// Pixel-art crab powered by Marcio Granzotto's hand-tuned CSS-keyframe SVG
// animations from https://github.com/marciogranzotto/clawd-tank (MIT).
// Each SVG is self-contained — referenced via <img>, the embedded CSS
// keyframes drive the animation. We just pick which SVG to show.

interface Props {
  mood: CrabMood;
  scale?: number; // arbitrary multiplier on a 96px base size
  onTap?: () => void;
  /** When true, render the disconnected pose regardless of mood. */
  disconnected?: boolean;
}

// Default-state animations, one per mood.
const MOOD_SVG: Record<CrabMood, string> = {
  chill: '/clawd/clawd-idle-living.svg',
  focused: '/clawd/clawd-working-typing.svg',
  cooking: '/clawd/clawd-working-builder.svg',
  burning: '/clawd/clawd-working-overheated.svg',
};

// Tap reactions — pool we pick from each press. Each reaction plays once
// for REACTION_MS ms, then we revert to mood.
const REACTIONS = [
  '/clawd/clawd-happy.svg',
  '/clawd/clawd-eureka.svg',
  '/clawd/clawd-grooving.svg',
  '/clawd/clawd-hat-mishap.svg',
  '/clawd/clawd-dizzy.svg',
  '/clawd/clawd-working-juggling.svg',
] as const;

const REACTION_MS = 3200;

export function Crab({ mood, scale = 6, onTap, disconnected = false }: Props): JSX.Element {
  const [reaction, setReaction] = useState<string | null>(null);

  useEffect(() => {
    if (!reaction) return;
    const t = setTimeout(() => setReaction(null), REACTION_MS);
    return () => clearTimeout(t);
  }, [reaction]);

  const trigger = (): void => {
    onTap?.();
    const pick = REACTIONS[Math.floor(Math.random() * REACTIONS.length)] ?? REACTIONS[0];
    setReaction(pick);
  };

  // Size: 32 grid units × scale (legacy from the rect-svg version). Clawd
  // viewBoxes are ~45 units so we widen the wrapper proportionally.
  const size = 32 * scale;
  const src = disconnected
    ? '/clawd/clawd-disconnected.svg'
    : (reaction ?? MOOD_SVG[mood]);

  return (
    <motion.button
      type="button"
      aria-label={`tap crab — currently ${mood}${reaction ? ' (reacting)' : ''}`}
      onClick={trigger}
      onPointerDown={(e) => e.stopPropagation()}
      whileTap={{ scale: 0.94 }}
      style={{
        width: size,
        height: size,
        position: 'relative',
        background: 'transparent',
        border: 0,
        padding: 0,
        cursor: 'pointer',
        touchAction: 'manipulation',
        imageRendering: 'pixelated',
        // The SVGs already have their own intrinsic animation loops; an
        // outer breathing wrapper would conflict, so we leave the wrapper
        // static and let the inner SVG drive everything.
      }}
    >
      <AnimatePresence mode="popLayout">
        <motion.img
          key={src}
          src={src}
          alt=""
          draggable={false}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            // Filter shifts let us hint mood without re-coloring every SVG.
            filter: moodFilter(mood, !!reaction),
            pointerEvents: 'none',
          }}
        />
      </AnimatePresence>
    </motion.button>
  );
}

// Subtle hue/saturation shift per mood so the crab visually warms with
// intensity. Reactions get a tiny saturation boost to feel zippier.
function moodFilter(mood: CrabMood, reacting: boolean): string {
  const base =
    mood === 'chill'
      ? 'hue-rotate(0deg) saturate(0.95)'
      : mood === 'focused'
        ? 'hue-rotate(10deg) saturate(1.05)'
        : mood === 'cooking'
          ? 'hue-rotate(-15deg) saturate(1.15)'
          : 'hue-rotate(-30deg) saturate(1.25) brightness(1.05)';
  return reacting ? `${base} saturate(1.25) brightness(1.05)` : base;
}
