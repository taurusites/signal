import { Box, Text } from 'ink';
import type { CrabMood } from '../../core/Aggregator';

// ASCII crab. Five lines tall. Eye + mouth glyphs change with mood. Inspired
// by the Claude Crab from the community / Anthropic culture — drawn fresh
// here in ASCII so we are not embedding any copyrighted artwork.
//
//   _, _      <- antennae
//  /◉_◉\     <- shell + eyes (state-dependent)
//  C\ww/⊃    <- claws + mouth (state-dependent)
//  /‾‾‾‾\    <- under-shell
//  '' '' ''  <- legs

interface Face {
  eyes: string;
  mouth: string;
  color: 'green' | 'yellow' | 'magenta' | 'red';
  caption: string;
}

const FACES: Record<CrabMood, Face> = {
  chill: { eyes: '◔ ◔', mouth: '‿‿', color: 'green', caption: 'chillin' },
  focused: { eyes: '◉ ◉', mouth: 'ww', color: 'yellow', caption: 'focused' },
  cooking: { eyes: '◕ ◕', mouth: '◊◊', color: 'magenta', caption: 'cooking' },
  burning: { eyes: '× ×', mouth: 'MM', color: 'red', caption: 'on fire' },
};

interface Props {
  mood: CrabMood;
}

export function Crab({ mood }: Props): JSX.Element {
  const f = FACES[mood];
  return (
    <Box flexDirection="column">
      <Text>
        <Text color={f.color}> _, _ </Text>
      </Text>
      <Text>
        <Text color={f.color}> /</Text>
        <Text bold>{f.eyes}</Text>
        <Text color={f.color}>\</Text>
      </Text>
      <Text>
        <Text color={f.color}>C\</Text>
        <Text bold>{f.mouth}</Text>
        <Text color={f.color}>/⊃</Text>
      </Text>
      <Text>
        <Text color={f.color}> /‾‾‾‾\</Text>
      </Text>
      <Text>
        <Text dimColor>'' '' ''</Text>
      </Text>
      <Text dimColor>{` ${f.caption}`}</Text>
    </Box>
  );
}
