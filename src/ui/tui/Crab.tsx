import { Box, Text } from 'ink';
import { useEffect, useRef, useState } from 'react';
import type { CrabMood } from '../../core/Aggregator';

// Animated ASCII crab — five lines tall, ~11 cols wide.
// Each mood has 2-3 frames that cycle at a mood-dependent tempo.
// A quiet auto-twitch loop fires a random reaction every 18-40 s so
// the crab never reads as frozen.
//
// Terminal-safe characters: ASCII + unicode blocks already in use
// (▁▂▃▄▅▆▇█ ▟▙ ◔◉◕× ◊ ‿ ‾ C ⊃ ≪ ≫ Ↄ)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Reaction = 'wave' | 'jump' | 'dance' | 'spin';

// Each frame is exactly 5 lines of text.
type Frame = readonly [string, string, string, string, string];

// ---------------------------------------------------------------------------
// Mood frames
// ---------------------------------------------------------------------------
// Frame layout:
//   line 0 — antennae
//   line 1 — shell top + eyes
//   line 2 — claws + mouth
//   line 3 — under-shell
//   line 4 — legs

const MOOD_FRAMES: Record<CrabMood, readonly Frame[]> = {
  // chill: gentle breathing, eyes glance left ↔ right
  chill: [
    [' _, _  ', ' /◔ ◔\\ ', 'C\\‿‿/⊃', ' /‾‾\\ ', " '' '' "],
    [' _, _  ', ' /◔  ◔\\', 'C\\‿‿/⊃', ' /‾‾\\ ', "  ' '' "],
    [' _, _  ', '/◔   ◔\\', 'C\\‿‿/⊃', ' /‾‾\\ ', " '' '  "],
  ],
  // focused: eyes locked forward, claws alternate bob
  focused: [
    [' _, _  ', ' /◉ ◉\\ ', 'C\\ww/⊃ ', ' /‾‾\\ ', " '  '' "],
    [' _, _  ', ' /◉ ◉\\ ', 'c\\ww/Ↄ ', ' /‾‾\\ ', " '' '  "],
  ],
  // cooking: claws hammer down, body squashes
  cooking: [
    [' _, _  ', ' /◕ ◕\\ ', 'C\\◊◊/⊃ ', ' /‾‾\\ ', " '' '' "],
    [' _, _  ', ' /◕ ◕\\ ', 'c\\◊◊/Ↄ ', ' /▁▁\\ ', "  '' ' "],
    [' _, _  ', ' /◕ ◕\\ ', 'C\\◊◊/⊃ ', ' /‾‾\\ ', " ' ''  "],
  ],
  // burning: strained + jittery, body shifts
  burning: [
    [' _ _   ', ' /× ×\\ ', 'C\\MM/⊃ ', ' /‾‾\\ ', " '_'   "],
    [' _ _   ', ' /× ×\\ ', 'C\\MM/Ↄ ', ' /‾‾\\ ', " '. .' "],
  ],
};

// ---------------------------------------------------------------------------
// Mood tempo (ms per frame)
// ---------------------------------------------------------------------------

const MOOD_TEMPO: Record<CrabMood, number> = {
  burning: 200,
  cooking: 300,
  focused: 420,
  chill: 700,
};

// ---------------------------------------------------------------------------
// Reaction frames + durations
// ---------------------------------------------------------------------------

const REACTION_FRAMES: Record<Reaction, readonly Frame[]> = {
  // wave: left claw lifts (≪ replaces C)
  wave: [
    [' _, _  ', ' /◉ ◉\\ ', '≪\\--/⊃ ', ' /‾‾\\ ', " '' '' "],
    [' _, _  ', ' /◉ ◉\\ ', 'C\\ww/⊃ ', ' /‾‾\\ ', " '' '' "],
    [' _, _  ', ' /◉ ◉\\ ', '≪\\--/⊃ ', ' /‾‾\\ ', " '' '' "],
  ],
  // jump: body shifts up, top antenna line replaced by blank
  jump: [
    ['       ', ' _, _  ', 'C\\◔◔/⊃ ', ' /‾‾\\ ', " '' '' "],
    [' _, _  ', ' /◔ ◔\\ ', 'C\\‿‿/⊃', ' /‾‾\\ ', '       '],
    [' _, _  ', ' /◔ ◔\\ ', 'C\\‿‿/⊃', ' /‾‾\\ ', " '' '' "],
  ],
  // dance: body sways left then right
  dance: [
    [' _, _  ', '/◉ ◉\\  ', 'C\\ww/⊃ ', ' /‾‾\\ ', "  ' '' "],
    [' _, _  ', '  /◉ ◉\\', ' c\\ww/Ↄ', '  /‾‾\\', " ''  ' "],
    [' _, _  ', '/◉ ◉\\  ', 'C\\ww/⊃ ', ' /‾‾\\ ', "  ' '' "],
  ],
  // spin: eyes cycle through *, o, ◉
  spin: [
    [' _, _  ', ' /* *\\ ', 'C\\--/⊃ ', ' /‾‾\\ ', " '' '' "],
    [' _, _  ', ' /o o\\ ', 'C\\--/⊃ ', ' /‾‾\\ ', " '' '' "],
    [' _, _  ', ' /◉ ◉\\ ', 'C\\--/⊃ ', ' /‾‾\\ ', " '' '' "],
    [' _, _  ', ' /o o\\ ', 'C\\--/⊃ ', ' /‾‾\\ ', " '' '' "],
  ],
};

// How long (ms) each reaction plays before returning to mood loop
const REACTION_DURATION: Record<Reaction, number> = {
  wave: 900,
  jump: 600,
  dance: 1200,
  spin: 800,
};

const REACTIONS: readonly Reaction[] = ['wave', 'jump', 'dance', 'spin'];

// ---------------------------------------------------------------------------
// Mood color + caption
// ---------------------------------------------------------------------------

const MOOD_META: Record<
  CrabMood,
  { color: 'green' | 'yellow' | 'magenta' | 'red'; caption: string }
> = {
  chill: { color: 'green', caption: 'chillin' },
  focused: { color: 'yellow', caption: 'focused' },
  cooking: { color: 'magenta', caption: 'cooking' },
  burning: { color: 'red', caption: 'on fire' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  mood: CrabMood;
}

export function Crab({ mood }: Props): JSX.Element {
  const [frameIdx, setFrameIdx] = useState(0);
  const [activeReaction, setActiveReaction] = useState<Reaction | null>(null);

  // Ref so the twitch loop always sees current reaction state
  const reactionRef = useRef<Reaction | null>(null);
  reactionRef.current = activeReaction;

  // Advance frame at mood tempo
  useEffect(() => {
    const tempo = MOOD_TEMPO[mood];
    const id = setInterval(() => {
      setFrameIdx((i) => i + 1);
    }, tempo);
    return () => clearInterval(id);
  }, [mood]);

  // Auto-twitch loop: pick a random reaction every 18-40 s
  useEffect(() => {
    let twitchId: ReturnType<typeof setTimeout>;

    const schedule = (): void => {
      const delay = 18_000 + Math.random() * 22_000; // 18-40 s
      twitchId = setTimeout(() => {
        if (reactionRef.current !== null) {
          // already reacting — skip this tick and reschedule
          schedule();
          return;
        }
        const reaction = REACTIONS[Math.floor(Math.random() * REACTIONS.length)] as Reaction;
        setActiveReaction(reaction);
        setFrameIdx(0);
        setTimeout(() => {
          setActiveReaction(null);
          setFrameIdx(0);
          schedule();
        }, REACTION_DURATION[reaction]);
      }, delay);
    };

    schedule();
    return () => clearTimeout(twitchId);
  }, []);

  const meta = MOOD_META[mood];

  // Resolve current frame
  let frames: readonly Frame[];
  if (activeReaction !== null) {
    frames = REACTION_FRAMES[activeReaction];
  } else {
    frames = MOOD_FRAMES[mood];
  }
  const frame = frames[frameIdx % frames.length] as Frame;

  return (
    <Box flexDirection="column">
      <Text color={meta.color}>{frame[0]}</Text>
      <Text color={meta.color}>{frame[1]}</Text>
      <Text color={meta.color}>{frame[2]}</Text>
      <Text color={meta.color}>{frame[3]}</Text>
      <Text dimColor>{frame[4]}</Text>
      <Text dimColor>{` ${meta.caption}`}</Text>
    </Box>
  );
}
