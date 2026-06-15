import { existsSync, watch } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Box, Text, useApp, useInput } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import { aggregateClaude } from '../../core/Aggregator';
import type { EventStore } from '../../core/EventStore';
import { HardwareSampler } from '../../core/HardwareSampler';
import type { PollScheduler } from '../../core/PollScheduler';
import type { HwSample, ProviderAdapter } from '../../core/types';
import { ClaudeCard } from './ClaudeCard';
import { HeaderBar } from './HeaderBar';

interface Props {
  adapters: ProviderAdapter[];
  store: EventStore;
  scheduler: PollScheduler;
  sampleIntervalMs: number;
  useSystemInformation: boolean;
  /** Called when the user presses `c` to open ~/.signal/config.toml.
   *  Receives a signal to launch $EDITOR after the TUI unmounts. */
  onEditConfig?: () => void;
}

export function App({
  adapters,
  store,
  scheduler,
  sampleIntervalMs,
  useSystemInformation,
  onEditConfig,
}: Props): React.ReactElement {
  const { exit } = useApp();
  const [, setTick] = useState(0);
  const [hw, setHw] = useState<HwSample | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useInput((input) => {
    if (input === 'q') exit();
    if (input === '?') setShowHelp((s) => !s);
    if (input === 'c') {
      onEditConfig?.();
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

    // 1s heartbeat keeps "last turn 12s ago" and the reset countdown ticking
    // even when no new file events fire.
    const heartbeat = setInterval(() => setTick((t) => t + 1), 1000);

    // Watch ~/.claude/projects for new JSONL writes — fires the scheduler
    // immediately on Claude activity instead of waiting for the next 5s tick.
    const claudeProjects = join(homedir(), '.claude', 'projects');
    let watcher: ReturnType<typeof watch> | null = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    if (existsSync(claudeProjects)) {
      try {
        watcher = watch(claudeProjects, { recursive: true }, (_event, filename) => {
          if (!filename || !filename.toString().endsWith('.jsonl')) return;
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => {
            void scheduler.runOnce().then(() => setTick((t) => t + 1));
          }, 250);
        });
      } catch {
        // fs.watch recursive not supported on this platform — fall back to 5s poll.
      }
    }

    return () => {
      cancelled = true;
      scheduler.stop();
      clearInterval(heartbeat);
      if (debounce) clearTimeout(debounce);
      watcher?.close();
    };
  }, [scheduler, store, sampleIntervalMs, useSystemInformation]);

  const claude = adapters.find((a) => a.id === 'claude');
  const summary = claude ? aggregateClaude(store.latestEvents(claude.id, 500)) : null;
  const lastError = claude ? (store.getProviderState(claude.id)?.lastError ?? null) : null;

  return (
    <Box flexDirection="column">
      <HeaderBar hw={hw} />
      {summary ? <ClaudeCard summary={summary} lastError={lastError} /> : null}
      {showHelp ? (
        <Box paddingX={1} flexDirection="column">
          <Text>q · quit</Text>
          <Text>c · open ~/.signal/config.toml in $EDITOR</Text>
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
