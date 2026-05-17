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
  const [tick, setTick] = useState(0);
  const [hw, setHw] = useState<HwSample | null>(null);

  useInput((input) => {
    if (input === 'q') exit();
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
    const events = store.latestEvents(a.id, 20);
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
    return {
      id: a.id,
      name: a.displayName,
      util: cur,
      burn,
      etaMs: eta,
      sparkline,
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
            lastError={r.lastError}
          />
        ))}
      </Box>
      <Box paddingX={1}>
        <Text dimColor>tick {tick} · q quit</Text>
      </Box>
    </Box>
  );
}
