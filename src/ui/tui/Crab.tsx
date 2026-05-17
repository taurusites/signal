import { Box, Text } from 'ink';
import { useEffect, useRef, useState } from 'react';
import type { CrabMood } from '../../core/Aggregator';

// Animated ASCII crab — six lines tall (one particle row + five crab rows),
// ~14 cols wide. Each mood has 4-5 hand-drawn frames that cycle at a
// mood-dependent tempo. Frames vary three independent dimensions:
//   1. horizontal walking (leading whitespace shifts the crab in its lane)
//   2. body pose (eyes drift, claws bob, mouth squashes)
//   3. ambient particles above the crab (sparks, heatwaves, bubbles, focus)
//
// A quiet auto-twitch loop fires a random reaction every 18-40 s so the
// crab never reads as frozen.
//
// Terminal-safe characters only:
//   ASCII + ▁▂▃▄▅▆▇█ ▟▙ ◔◉◕× ◊ ‿ ‾ ~ * . o C ⊃ ≪ Ↄ
//
// Strings use template literals (backticks) because the legs row contains
// apostrophes that would otherwise terminate single-quoted strings.

type Reaction = 'wave' | 'jump' | 'dance' | 'spin';

// Six-line frame: row 0 is the ambient-particle row above the crab; rows
// 1-5 are the crab itself (antennae, shell+eyes, claws+mouth, under-shell,
// legs).
type Frame = readonly [string, string, string, string, string, string];

const MOOD_FRAMES: Record<CrabMood, readonly Frame[]> = {
  // chill: crab drifts left → right, eyes scan, occasional bubble drifts up
  chill: [
    [
      `  o           `,
      `   _, _       `,
      `  /◔ ◔\\      `,
      ` C\\‿‿/⊃      `,
      `  /‾‾\\       `,
      `   '' ''      `,
    ],
    [
      `   .          `,
      `    _, _      `,
      `   /◔  ◔\\    `,
      `  C\\‿‿/⊃     `,
      `   /‾‾\\      `,
      `    '  ''     `,
    ],
    [
      `         o    `,
      `     _, _     `,
      `    /◔  ◔\\   `,
      `   C\\‿‿/⊃    `,
      `    /‾‾\\     `,
      `     '' '     `,
    ],
    [
      `        .  o  `,
      `    _, _      `,
      `   /◔ ◔\\     `,
      `  C\\‿‿/⊃     `,
      `   /‾‾\\      `,
      `    '  ''     `,
    ],
  ],

  // focused: small jitter, thinking dots above, eyes locked
  focused: [
    [
      `       . .    `,
      `   _, _       `,
      `  /◉ ◉\\      `,
      ` C\\ww/⊃      `,
      `  /‾‾\\       `,
      `   '  ''      `,
    ],
    [
      `      . . .   `,
      `   _, _       `,
      `  /◉ ◉\\      `,
      ` c\\ww/Ↄ      `,
      `  /‾‾\\       `,
      `   ''  '      `,
    ],
    [
      `       . .    `,
      `    _, _      `,
      `   /◉ ◉\\     `,
      `  C\\ww/⊃     `,
      `   /‾‾\\      `,
      `    '  ''     `,
    ],
    [
      `      .  .   .`,
      `    _, _      `,
      `   /◉ ◉\\     `,
      `  c\\ww/Ↄ     `,
      `   /‾‾\\      `,
      `    ''  '     `,
    ],
  ],

  // cooking: sparks above, claws hammer, body squashes
  cooking: [
    [
      `    *   . *   `,
      `   _, _       `,
      `  /◕ ◕\\      `,
      ` C\\◊◊/⊃      `,
      `  /‾‾\\       `,
      `   '' ''      `,
    ],
    [
      `  *  . *  .   `,
      `   _, _       `,
      `  /◕ ◕\\      `,
      ` c\\◊◊/Ↄ      `,
      `  /▁▁\\       `,
      `   '  ''      `,
    ],
    [
      `    .  *  *   `,
      `    _, _      `,
      `   /◕ ◕\\     `,
      `  C\\◊◊/⊃     `,
      `   /‾‾\\      `,
      `    '' '      `,
    ],
    [
      ` *  .  . *    `,
      `    _, _      `,
      `   /◕ ◕\\     `,
      `  c\\◊◊/Ↄ     `,
      `   /▁▁\\      `,
      `    '  ''     `,
    ],
    [
      `   * . *  .   `,
      `   _, _       `,
      `  /◕ ◕\\      `,
      ` C\\◊◊/⊃      `,
      `  /‾‾\\       `,
      `   '' ''      `,
    ],
  ],

  // burning: heatwaves above, body shudders, eyes wild
  burning: [
    [
      `  ~ ~~  ~ ~   `,
      `   _ _        `,
      `  /× ×\\      `,
      ` C\\MM/⊃      `,
      `  /‾‾\\       `,
      `   '_'        `,
    ],
    [
      ` ~~  ~ ~~  ~  `,
      `    _ _       `,
      `   /× ×\\     `,
      `  C\\MM/Ↄ     `,
      `   /‾‾\\      `,
      `    '. .'     `,
    ],
    [
      `  ~ ~~  ~~ ~  `,
      `   _ _        `,
      `  /× ×\\      `,
      ` c\\MM/⊃      `,
      `  /‾‾\\       `,
      `   '_'        `,
    ],
    [
      ` ~ ~~  ~ ~~   `,
      `    _ _       `,
      `   /× ×\\     `,
      `  C\\MM/Ↄ     `,
      `   /‾‾\\      `,
      `    '. .'     `,
    ],
  ],
};

const MOOD_TEMPO: Record<CrabMood, number> = {
  burning: 200,
  cooking: 280,
  focused: 380,
  chill: 600,
};

const REACTION_FRAMES: Record<Reaction, readonly Frame[]> = {
  // wave: left claw lifts (≪ replaces C) — three-beat hello
  wave: [
    [
      `              `,
      `   _, _       `,
      `  /◉ ◉\\      `,
      ` ≪\\--/⊃      `,
      `  /‾‾\\       `,
      `   '' ''      `,
    ],
    [
      `              `,
      `   _, _       `,
      `  /◉ ◉\\      `,
      ` C\\ww/⊃      `,
      `  /‾‾\\       `,
      `   '' ''      `,
    ],
    [
      `              `,
      `   _, _       `,
      `  /◉ ◉\\      `,
      ` ≪\\--/⊃      `,
      `  /‾‾\\       `,
      `   '' ''      `,
    ],
  ],

  // jump: crab floats up one line then settles
  jump: [
    [
      `   _, _       `,
      `  /◔ ◔\\      `,
      ` C\\‿‿/⊃      `,
      `  /‾‾\\       `,
      `              `,
      `              `,
    ],
    [
      `              `,
      `   _, _       `,
      `  /◔ ◔\\      `,
      ` C\\‿‿/⊃      `,
      `  /‾‾\\       `,
      `   '' ''      `,
    ],
    [
      `              `,
      `   _, _       `,
      `  /◔ ◔\\      `,
      ` C\\‿‿/⊃      `,
      `  /‾‾\\       `,
      `   '' ''      `,
    ],
  ],

  // dance: sways left ↔ right
  dance: [
    [
      `              `,
      ` _, _         `,
      `/◉ ◉\\        `,
      `C\\ww/⊃       `,
      ` /‾‾\\        `,
      `  ' ''        `,
    ],
    [
      `              `,
      `     _, _     `,
      `    /◉ ◉\\    `,
      `   c\\ww/Ↄ    `,
      `    /‾‾\\     `,
      `     ''  '    `,
    ],
    [
      `              `,
      ` _, _         `,
      `/◉ ◉\\        `,
      `C\\ww/⊃       `,
      ` /‾‾\\        `,
      `  ' ''        `,
    ],
    [
      `              `,
      `     _, _     `,
      `    /◉ ◉\\    `,
      `   c\\ww/Ↄ    `,
      `    /‾‾\\     `,
      `     ''  '    `,
    ],
  ],

  // spin: eyes cycle through *, o, ◉ — stars trail above
  spin: [
    [
      `   . .   .    `,
      `   _, _       `,
      `  /* *\\      `,
      ` C\\--/⊃      `,
      `  /‾‾\\       `,
      `   '' ''      `,
    ],
    [
      `  .  . .      `,
      `   _, _       `,
      `  /o o\\      `,
      ` C\\--/⊃      `,
      `  /‾‾\\       `,
      `   '' ''      `,
    ],
    [
      `    .    . .  `,
      `   _, _       `,
      `  /◉ ◉\\      `,
      ` C\\--/⊃      `,
      `  /‾‾\\       `,
      `   '' ''      `,
    ],
    [
      ` . .  .       `,
      `   _, _       `,
      `  /o o\\      `,
      ` C\\--/⊃      `,
      `  /‾‾\\       `,
      `   '' ''      `,
    ],
  ],
};

const REACTION_DURATION: Record<Reaction, number> = {
  wave: 900,
  jump: 600,
  dance: 1200,
  spin: 800,
};

const REACTIONS: readonly Reaction[] = ['wave', 'jump', 'dance', 'spin'];

type CrabColor = 'green' | 'yellow' | 'magenta' | 'red';

const MOOD_META: Record<
  CrabMood,
  { color: CrabColor; particleColor: CrabColor | 'cyan'; caption: string }
> = {
  chill: { color: 'green', particleColor: 'cyan', caption: 'chillin' },
  focused: { color: 'yellow', particleColor: 'yellow', caption: 'focused' },
  cooking: { color: 'magenta', particleColor: 'yellow', caption: 'cooking' },
  burning: { color: 'red', particleColor: 'red', caption: 'on fire' },
};

interface Props {
  mood: CrabMood;
}

export function Crab({ mood }: Props): JSX.Element {
  const [frameIdx, setFrameIdx] = useState(0);
  const [activeReaction, setActiveReaction] = useState<Reaction | null>(null);

  const reactionRef = useRef<Reaction | null>(null);
  reactionRef.current = activeReaction;

  useEffect(() => {
    const tempo = MOOD_TEMPO[mood];
    const id = setInterval(() => {
      setFrameIdx((i) => i + 1);
    }, tempo);
    return () => clearInterval(id);
  }, [mood]);

  useEffect(() => {
    let twitchId: ReturnType<typeof setTimeout>;
    const schedule = (): void => {
      const delay = 18_000 + Math.random() * 22_000;
      twitchId = setTimeout(() => {
        if (reactionRef.current !== null) {
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
  const frames: readonly Frame[] =
    activeReaction !== null ? REACTION_FRAMES[activeReaction] : MOOD_FRAMES[mood];
  const frame = frames[frameIdx % frames.length] as Frame;

  return (
    <Box flexDirection="column">
      <Text color={meta.particleColor}>{frame[0]}</Text>
      <Text color={meta.color}>{frame[1]}</Text>
      <Text color={meta.color}>{frame[2]}</Text>
      <Text color={meta.color}>{frame[3]}</Text>
      <Text color={meta.color}>{frame[4]}</Text>
      <Text dimColor>{frame[5]}</Text>
      <Text dimColor>{` ${meta.caption}`}</Text>
    </Box>
  );
}
