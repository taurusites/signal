import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import type { CrabMood } from '../../core/Aggregator';
import {
  MOOD_TEMPO,
  type PixelGrid,
  SPRITE_H,
  SPRITE_W,
  gridFor,
  particleColor,
  poseCount,
} from './crabSprite';

// Pixel-art crab in the terminal — direct port of Marcio Granzotto's
// clawd-tank rect-grid SVG, rendered as unicode half-blocks (▀) with
// truecolor fg/bg. 15×16 pixel sprite → 15-wide × 8-tall character cells.
// Credit: github.com/marciogranzotto/clawd-tank (MIT)

// Particle row above the crab, mood-coded.
const PARTICLE_FRAMES: Record<CrabMood, string[]> = {
  chill: ['  o         ', '       .    ', '         o  ', '   .  o     '],
  focused: ['    . .     ', '   . . .    ', '    . .     ', '     . .   .'],
  cooking: ['   *  .  *  ', ' *   . *    ', '   .   *  * ', '*   .   *  .'],
  burning: [' ~ ~~  ~ ~  ', '~~  ~ ~~  ~ ', '~~ ~~ ~ ~ ~ ', ' ~  ~~ ~ ~~ '],
};

const CAPTION: Record<CrabMood, string> = {
  chill: 'chillin',
  focused: 'focused',
  cooking: 'cooking',
  burning: 'on fire',
};

interface Row {
  segments: { ch: string; fg?: string; bg?: string }[];
}

/**
 * Compress a SPRITE_H-row pixel grid into SPRITE_H/2 character rows by
 * pairing each (top, bottom) pixel into a single half-block cell:
 *
 *   both null          → ' ' transparent
 *   only top filled    → '▀' with fg=top
 *   only bottom filled → '▄' with fg=bottom
 *   both filled        → '▀' with fg=top, bg=bottom
 *
 * Then runs of identical (ch, fg, bg) are coalesced so Ink renders fewer
 * <Text> segments — crucial because per-cell coloring is the most expensive
 * thing we can do.
 */
function gridToRows(grid: PixelGrid): Row[] {
  const rows: Row[] = [];
  for (let y = 0; y < SPRITE_H; y += 2) {
    const segs: { ch: string; fg?: string; bg?: string }[] = [];
    for (let x = 0; x < SPRITE_W; x++) {
      const top = grid[y]?.[x] ?? null;
      const bot = grid[y + 1]?.[x] ?? null;
      let ch: string;
      let fg: string | undefined;
      let bg: string | undefined;
      if (top === null && bot === null) {
        ch = ' ';
      } else if (top !== null && bot === null) {
        ch = '▀';
        fg = top;
      } else if (top === null && bot !== null) {
        ch = '▄';
        fg = bot;
      } else if (top !== null && bot !== null) {
        ch = '▀';
        fg = top;
        bg = bot;
      } else {
        ch = ' ';
      }
      // Coalesce with the previous segment if style + glyph match.
      const prev = segs[segs.length - 1];
      if (prev && prev.ch === ch && prev.fg === fg && prev.bg === bg) {
        prev.ch += ch; // accumulate the char run
      } else {
        // Multi-char runs need a length-bearing field; use the ch field
        // itself as the buffer (we'll rebuild a string on render).
        segs.push({ ch, fg, bg });
      }
    }
    rows.push({ segments: segs });
  }
  return rows;
}

interface Props {
  mood: CrabMood;
}

export function Crab({ mood }: Props): JSX.Element {
  const [frameIdx, setFrameIdx] = useState(0);

  // Cycle frames at the mood tempo.
  useEffect(() => {
    const tempo = MOOD_TEMPO[mood];
    const id = setInterval(() => setFrameIdx((i) => i + 1), tempo);
    return () => clearInterval(id);
  }, [mood]);

  const grid = gridFor(mood, frameIdx);
  const rows = gridToRows(grid);
  const particleRow = PARTICLE_FRAMES[mood][frameIdx % PARTICLE_FRAMES[mood].length] ?? '';
  const partColor = particleColor(mood);

  return (
    <Box flexDirection="column">
      <Text color={partColor}>{particleRow}</Text>
      {rows.map((row, ri) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: row count is constant
        <Text key={ri}>
          {row.segments.map((seg, si) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: segment count is constant per row
            <Text key={si} color={seg.fg} backgroundColor={seg.bg}>
              {seg.ch}
            </Text>
          ))}
        </Text>
      ))}
      <Text dimColor>{` ${CAPTION[mood]}`}</Text>
    </Box>
  );
}

// Silence unused-import warning when pose count is consumed elsewhere.
void poseCount;
