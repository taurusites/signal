import { describe, expect, test } from 'bun:test';
import { EventStore } from '../../src/core/EventStore';
import { PollScheduler } from '../../src/core/PollScheduler';
import type { AuthStatus, ProviderAdapter, ProviderId, UsageEvent } from '../../src/core/types';

function makeAdapter(
  opts: { id?: ProviderId; throws?: boolean; events?: UsageEvent[] } = {},
): ProviderAdapter {
  return {
    id: opts.id ?? 'claude',
    displayName: 'Test',
    pollIntervalMs: 10,
    detect: async () => true,
    authStatus: async (): Promise<AuthStatus> => ({ kind: 'ok' }),
    pollOnce: async () => {
      if (opts.throws) throw new Error('boom');
      return opts.events ?? [];
    },
  };
}

describe('PollScheduler', () => {
  test('runs pollOnce and writes events for healthy adapter', async () => {
    const store = new EventStore(':memory:');
    const sched = new PollScheduler(store);
    sched.add(
      makeAdapter({
        events: [
          {
            provider: 'claude',
            ts: new Date(),
            model: null,
            inputTokens: 10,
            outputTokens: 20,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            sessionId: null,
            projectPath: null,
            raw: {},
          },
        ],
      }),
    );
    await sched.runOnce();
    expect(store.latestEvents('claude', 5)).toHaveLength(1);
    expect(store.getProviderState('claude')?.lastError).toBe(null);
  });

  test('isolates failing adapter — others still record events', async () => {
    const store = new EventStore(':memory:');
    const sched = new PollScheduler(store);
    sched.add(makeAdapter({ id: 'claude', throws: true }));
    sched.add(
      makeAdapter({
        id: 'cursor',
        events: [
          {
            provider: 'cursor',
            ts: new Date(),
            model: null,
            inputTokens: 5,
            outputTokens: 5,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            sessionId: null,
            projectPath: null,
            raw: {},
          },
        ],
      }),
    );
    await sched.runOnce();
    expect(store.getProviderState('claude')?.lastError).toMatch(/boom/);
    expect(store.latestEvents('cursor', 5)).toHaveLength(1);
  });
});
