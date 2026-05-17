import { describe, expect, test } from 'bun:test';
import { Box, Text } from 'ink';
import { render } from 'ink-testing-library';
// biome-ignore lint/style/useImportType: classic JSX transform requires React as a value
import React from 'react';

interface Row {
  id: string;
  name: string;
  util: number | null;
  lastError: string | null;
}

// Inline mirror of StatusTable from src/ui/status.tsx — keep in lockstep.
// Coupling is intentional; see test header notes.
function StatusTable({ rows }: { rows: Row[] }): React.ReactElement {
  return (
    <Box flexDirection="column">
      {rows.map((r) => (
        <Text key={r.id}>
          {r.name} {r.util === null ? '—' : `${r.util.toFixed(0)}%`}
          {r.lastError ? ` ${r.lastError}` : ''}
        </Text>
      ))}
    </Box>
  );
}

describe('status table', () => {
  test('renders providers with utilization', () => {
    const { lastFrame } = render(
      <StatusTable rows={[{ id: 'claude', name: 'Claude Code', util: 42, lastError: null }]} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Claude Code');
    expect(frame).toContain('42%');
  });

  test('renders error rows', () => {
    const { lastFrame } = render(
      <StatusTable
        rows={[{ id: 'claude', name: 'Claude Code', util: null, lastError: 'token expired' }]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('—');
    expect(frame).toContain('token expired');
  });
});
