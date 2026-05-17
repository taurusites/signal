import { Box, Text } from 'ink';
import type React from 'react';
import type { HwSample } from '../../core/types';
import { bar, severityColor } from './theme';

interface Props {
  hw: HwSample | null;
}

// Tiny identity glyph — block art that suggests a sine wave / signal.
const GLYPH = '▟▙';

export function HeaderBar({ hw }: Props): React.ReactElement {
  const memPct = hw ? (hw.memUsedBytes / hw.memTotalBytes) * 100 : null;
  const gpu = hw && typeof hw.gpuPct === 'number' ? `${hw.gpuPct.toFixed(0)}%` : null;
  return (
    <Box borderStyle="single" borderColor="white" paddingX={1} flexDirection="row">
      <Box width={24} flexDirection="column">
        <Text bold>
          <Text color="cyan">{GLYPH}</Text> signal
        </Text>
        <Text dimColor>signal, not noise</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        <Box>
          <Box width={5}>
            <Text>cpu</Text>
          </Box>
          <Box width={20}>
            <Text color={severityColor(hw?.cpuPct ?? null)}>{bar(hw?.cpuPct ?? null, 14)}</Text>
          </Box>
          <Box width={8}>
            <Text>{hw ? `${hw.cpuPct.toFixed(0)}%` : '—'}</Text>
          </Box>
          <Text dimColor>load {hw ? hw.load1m.toFixed(2) : '—'}</Text>
        </Box>
        <Box>
          <Box width={5}>
            <Text>ram</Text>
          </Box>
          <Box width={20}>
            <Text color={severityColor(memPct)}>{bar(memPct, 14)}</Text>
          </Box>
          <Box width={8}>
            <Text>{memPct === null ? '—' : `${memPct.toFixed(0)}%`}</Text>
          </Box>
          {gpu ? <Text dimColor>gpu {gpu}</Text> : null}
        </Box>
      </Box>
    </Box>
  );
}
