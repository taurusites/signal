import { Box, Text } from 'ink';
// biome-ignore lint/style/useImportType: classic JSX transform requires React as a value
import React from 'react';
import { formatEta } from '../../core/Forecaster';
import { bar, severityColor } from './theme';

interface Props {
  name: string;
  util: number | null;
  burn: number | null;
  etaMs: number | null;
  sparkline: number[];
  tokensWindow: number;
  lastError: string | null;
}

const SPARK_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

function spark(points: number[]): string {
  if (points.length === 0) return '';
  return points
    .map((p) => SPARK_CHARS[Math.max(0, Math.min(7, Math.floor((p / 100) * 7)))] ?? ' ')
    .join('');
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function ProviderRow({
  name,
  util,
  burn,
  etaMs,
  sparkline,
  tokensWindow,
  lastError,
}: Props): React.ReactElement {
  // When OAuth utilization isn't available (no keychain access, expired token, etc.)
  // fall back to showing JSONL token tally — at least the user sees activity.
  const utilCell =
    util === null
      ? tokensWindow > 0
        ? `${formatTokens(tokensWindow)} tok (5h)`
        : '—'
      : `${bar(util, 18)} ${util.toFixed(0)}%`;
  return (
    <Box paddingX={1}>
      <Box width={14}>
        <Text>{name}</Text>
      </Box>
      <Box width={28}>
        <Text color={severityColor(util)}>{utilCell}</Text>
      </Box>
      <Box width={14}>
        <Text dimColor>{spark(sparkline)}</Text>
      </Box>
      <Box width={16}>
        <Text>burn {burn === null ? '—' : `${burn.toFixed(1)}/h`}</Text>
      </Box>
      <Box width={14}>
        <Text>eta {formatEta(etaMs)}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text color="red">{lastError ?? ''}</Text>
      </Box>
    </Box>
  );
}
