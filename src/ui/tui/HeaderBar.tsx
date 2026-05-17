import { Box, Text } from 'ink';
// biome-ignore lint/style/useImportType: classic JSX transform requires React as a value
import React from 'react';
import type { HwSample } from '../../core/types';
import { bar, severityColor } from './theme';

interface Props {
  combinedUtil: number | null;
  hw: HwSample | null;
}

export function HeaderBar({ combinedUtil, hw }: Props): React.ReactElement {
  const memPct = hw ? (hw.memUsedBytes / hw.memTotalBytes) * 100 : null;
  const gpuLine = hw && typeof hw.gpuPct === 'number' ? `gpu ${hw.gpuPct.toFixed(0)}%` : '';
  return (
    <Box borderStyle="single" borderColor="white" paddingX={1} flexDirection="row">
      <Box flexDirection="column" width={40}>
        <Text bold>signal</Text>
        <Text>
          combined{' '}
          <Text color={severityColor(combinedUtil)}>
            {bar(combinedUtil)} {combinedUtil === null ? '—' : `${combinedUtil.toFixed(0)}%`}
          </Text>
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1}>
        <Text>
          cpu{'  '}
          <Text color={severityColor(hw?.cpuPct ?? null)}>
            {bar(hw?.cpuPct ?? null, 16)} {hw ? `${hw.cpuPct.toFixed(0)}%` : '—'}
          </Text>
          {'   load '}
          {hw ? hw.load1m.toFixed(2) : '—'}
        </Text>
        <Text>
          ram{'  '}
          <Text color={severityColor(memPct)}>
            {bar(memPct, 16)} {memPct === null ? '—' : `${memPct.toFixed(0)}%`}
          </Text>
          {'   '}
          {gpuLine}
        </Text>
      </Box>
    </Box>
  );
}
