import { Box, Text, useApp, useInput } from 'ink';
// biome-ignore lint/style/useImportType: classic JSX transform requires React as a value
import React, { useEffect, useState } from 'react';
import type { EventStore } from '../../core/EventStore';
import { burnRatePerHour, etaToCapMs } from '../../core/Forecaster';
import { HardwareSampler } from '../../core/HardwareSampler';
import type { PollScheduler } from '../../core/PollScheduler';
import type { HwSample, ProviderAdapter } from '../../core/types';
import { HeaderBar } from './HeaderBar';
import { ProviderRow } from './ProviderRow';

interface Props {
  adapters: ProviderAdapter[];
  store: EventStore;
  scheduler: PollScheduler;
  sampleIntervalMs: number;
  useSystemInformation: boolean;
}

interface OauthRaw {
  source?: string;
  usage?: { fiveHour?: { utilization: number } };
}

export function App({
  adapters,
  store,
  scheduler,
  sampleIntervalMs,
  useSystemInformation,
}: Props): React.ReactElement {
  const { exit } = useApp();
  const [, setTick] = useState(0);
  const [hw, setHw] = useState<HwSample | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useInput((input) => {
    if (input === 'q') exit();
    if (input === '?') setShowHelp((s) => !s);
    if (input === 'c') {
      // Exit the TUI so the user can run `signal config` — launching $EDITOR
      // from inside Ink's alt-screen mode mangles the terminal.
      exit();
    }
  });

  useEffect(() => {
    scheduler.start();
    const sampler = new HardwareSampler({ useSystemInformation });
    let cancelled = false;
    const loop = async (): Promise<void> => {
      while (!cancelled) {
        const s = await sampler.sample();
        if (cancelled) break;
        store.appendHwSample(s);
        setHw(s);
        setTick((t) => t + 1);
        await new Promise((r) => setTimeout(r, sampleIntervalMs));
      }
    };
    void loop();
    return () => {
      cancelled = true;
      scheduler.stop();
    };
  }, [scheduler, store, sampleIntervalMs, useSystemInformation]);

  const rows = adapters.map((a) => {
    const events = store.latestEvents(a.id, 200);
    const points = events
      .map((e) => {
        const raw = e.raw as OauthRaw | undefined;
        const util = raw?.source === 'oauth' ? (raw.usage?.fiveHour?.utilization ?? null) : null;
        return util === null ? null : { ts: e.ts, utilization: util };
      })
      .filter((x): x is { ts: Date; utilization: number } => x !== null);
    const cur = points[0]?.utilization ?? null;
    const burn = burnRatePerHour(points);
    const eta = cur !== null && burn !== null ? etaToCapMs(cur, burn) : null;
    const sparkline = points
      .slice(0, 12)
      .map((p) => p.utilization)
      .reverse();
    const state = store.getProviderState(a.id);
    // JSONL-source token tally for when OAuth is unavailable. Sums unique events
    // by (sessionId, ts) — the same JSONL line can appear in multiple polls.
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
      util: cur,
      burn,
      etaMs: eta,
      sparkline,
      tokensWindow,
      lastError: state?.lastError ?? null,
    };
  });

  const utilValues = rows.map((r) => r.util).filter((v): v is number => v !== null);
  const combinedUtil =
    utilValues.length > 0 ? utilValues.reduce((a, b) => a + b, 0) / utilValues.length : null;

  return (
    <Box flexDirection="column">
      <HeaderBar combinedUtil={combinedUtil} hw={hw} />
      <Box flexDirection="column" borderStyle="single" borderColor="white">
        {rows.map((r) => (
          <ProviderRow
            key={r.id}
            name={r.name}
            util={r.util}
            burn={r.burn}
            etaMs={r.etaMs}
            sparkline={r.sparkline}
            tokensWindow={r.tokensWindow}
            lastError={r.lastError}
          />
        ))}
      </Box>
      {showHelp ? (
        <Box paddingX={1} flexDirection="column">
          <Text>q · quit</Text>
          <Text>c · exit and edit ~/.signal/config.toml (run `signal config` after)</Text>
          <Text>? · toggle this help</Text>
        </Box>
      ) : (
        <Box paddingX={1}>
          <Text dimColor>? help · c config · q quit</Text>
        </Box>
      )}
    </Box>
  );
}
