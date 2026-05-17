import { Box, Text, render } from 'ink';
// biome-ignore lint/style/useImportType: classic JSX transform requires React as a value
import React from 'react';
import { ClaudeAdapter } from '../adapters/claude';
import { EventStore } from '../core/EventStore';
import { PollScheduler } from '../core/PollScheduler';
import { ProviderRegistry } from '../core/ProviderRegistry';
import { loadConfig, writeDefaultConfig } from '../core/config';
import type { ProviderAdapter } from '../core/types';

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

function StatusTable({ rows }: { rows: Row[] }): React.ReactElement {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="white">
      <Box paddingX={1}>
        <Text bold>signal — usage status</Text>
      </Box>
      {rows.map((r) => {
        const usageCell =
          r.util !== null
            ? `${r.util.toFixed(0)}%`
            : r.tokensWindow > 0
              ? `${formatTokens(r.tokensWindow)} tok (5h)`
              : '—';
        const color = r.lastError
          ? 'red'
          : r.util !== null && r.util > 90
            ? 'red'
            : r.util !== null && r.util > 70
              ? 'yellow'
              : 'green';
        return (
          <Box key={r.id} paddingX={1}>
            <Box width={16}>
              <Text>{r.name}</Text>
            </Box>
            <Box width={18}>
              <Text color={color}>{usageCell}</Text>
            </Box>
            <Box flexGrow={1}>
              <Text dimColor>{r.lastError ?? ''}</Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export async function runStatus(): Promise<number> {
  writeDefaultConfig();
  const cfg = loadConfig();
  const store = new EventStore(cfg.dbPath);
  const registry = new ProviderRegistry();
  const allAdapters: ProviderAdapter[] = [new ClaudeAdapter({ useOauth: cfg.claude.useOauth })];
  for (const a of allAdapters) if (cfg.enabledProviders.includes(a.id)) registry.register(a);
  const sched = new PollScheduler(store);
  for (const a of registry.list()) sched.add(a);
  await sched.runOnce();

  const rows: Row[] = registry.list().map((a) => {
    const state = store.getProviderState(a.id);
    const events = store.latestEvents(a.id, 200);
    const latest = events[0];
    const raw = latest?.raw as
      | { source?: string; usage?: { fiveHour?: { utilization: number } } }
      | undefined;
    const util = raw?.source === 'oauth' ? (raw.usage?.fiveHour?.utilization ?? null) : null;
    // JSONL fallback: dedup repeated events from overlapping polls, sum 5h window.
    const seen = new Set<string>();
    let tokensWindow = 0;
    const sinceMs = Date.now() - 5 * 3600_000;
    for (const e of events) {
      if (e.ts.getTime() < sinceMs) continue;
      const key = `${e.sessionId ?? ''}|${e.ts.getTime()}|${e.inputTokens}|${e.outputTokens}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tokensWindow += e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens;
    }
    return {
      id: a.id,
      name: a.displayName,
      util,
      tokensWindow,
      lastError: state?.lastError ?? null,
    };
  });

  const { unmount } = render(<StatusTable rows={rows} />);
  unmount();
  const exitCode = rows.some((r) => r.util !== null && r.util > 90)
    ? 2
    : rows.some((r) => r.util !== null && r.util > 70)
      ? 1
      : 0;
  store.close();
  return exitCode;
}
