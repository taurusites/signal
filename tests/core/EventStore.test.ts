import { beforeEach, describe, expect, test } from 'bun:test';
import { EventStore } from '../../src/core/EventStore';
import type { HwSample, UsageEvent } from '../../src/core/types';

let store: EventStore;
beforeEach(() => {
  store = new EventStore(':memory:');
});

const sampleEvent: UsageEvent = {
  provider: 'claude',
  ts: new Date('2026-05-17T10:00:00Z'),
  model: 'claude-opus-4-7',
  inputTokens: 100,
  outputTokens: 200,
  cacheCreationTokens: 50,
  cacheReadTokens: 25,
  sessionId: 'sess-1',
  projectPath: '/Users/x/proj',
  raw: { hello: 'world' },
};

describe('EventStore', () => {
  test('round-trips a usage event', () => {
    store.appendEvents([sampleEvent]);
    const latest = store.latestEvents('claude', 10);
    expect(latest).toHaveLength(1);
    const first = latest[0];
    expect(first?.inputTokens).toBe(100);
    expect(first?.model).toBe('claude-opus-4-7');
  });

  test('isolates events by provider', () => {
    store.appendEvents([sampleEvent, { ...sampleEvent, provider: 'cursor' }]);
    expect(store.latestEvents('claude', 10)).toHaveLength(1);
    expect(store.latestEvents('cursor', 10)).toHaveLength(1);
  });

  test('round-trips a hardware sample', () => {
    const hw: HwSample = {
      ts: new Date('2026-05-17T10:00:00Z'),
      cpuPct: 42.5,
      cpuPerCore: [40, 45, 41, 44],
      memUsedBytes: 8_000_000_000,
      memTotalBytes: 16_000_000_000,
      memPressurePct: 30,
      load1m: 1.2,
      load5m: 1.5,
      load15m: 1.8,
      gpuPct: 12,
    };
    store.appendHwSample(hw);
    const recent = store.recentHwSamples(10);
    expect(recent).toHaveLength(1);
    const sample = recent[0];
    expect(sample?.cpuPct).toBe(42.5);
    expect(sample?.cpuPerCore).toEqual([40, 45, 41, 44]);
  });

  test('records provider state with last error', () => {
    store.setProviderState('claude', {
      lastPollAt: new Date(),
      lastError: 'rate limit',
      authStatus: 'ok',
    });
    const state = store.getProviderState('claude');
    expect(state?.lastError).toBe('rate limit');
  });
});
