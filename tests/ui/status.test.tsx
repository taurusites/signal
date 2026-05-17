import { describe, expect, test } from 'bun:test';
import { Box, Text } from 'ink';
import { render } from 'ink-testing-library';
// biome-ignore lint/style/useImportType: classic JSX transform requires React as a value
import React from 'react';

interface Row {
  id: string;
  name: string;
  util: number | null;
  tokensWindow: number;
  lastError: string | null;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// Inline mirror of StatusTable from src/ui/status.tsx — keep in lockstep.
function StatusTable({ rows }: { rows: Row[] }): React.ReactElement {
  return (
    <Box flexDirection="column">
      {rows.map((r) => {
        const cell =
          r.util !== null
            ? `${r.util.toFixed(0)}%`
            : r.tokensWindow > 0
              ? `${formatTokens(r.tokensWindow)} tok (5h)`
              : '—';
        return (
          <Text key={r.id}>
            {r.name} {cell}
            {r.lastError ? ` ${r.lastError}` : ''}
          </Text>
        );
      })}
    </Box>
  );
}

describe('status table', () => {
  test('renders providers with utilization', () => {
    const { lastFrame } = render(
      <StatusTable
        rows={[{ id: 'claude', name: 'Claude Code', util: 42, tokensWindow: 0, lastError: null }]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Claude Code');
    expect(frame).toContain('42%');
  });

  test('renders error rows', () => {
    const { lastFrame } = render(
      <StatusTable
        rows={[
          {
            id: 'claude',
            name: 'Claude Code',
            util: null,
            tokensWindow: 0,
            lastError: 'token expired',
          },
        ]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('—');
    expect(frame).toContain('token expired');
  });

  test('falls back to JSONL token tally when util is null', () => {
    const { lastFrame } = render(
      <StatusTable
        rows={[
          {
            id: 'claude',
            name: 'Claude Code',
            util: null,
            tokensWindow: 12_345,
            lastError: null,
          },
        ]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('12.3k tok');
  });
});
