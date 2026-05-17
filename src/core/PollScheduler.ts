import type { EventStore } from './EventStore';
import type { ProviderAdapter } from './types';

export class PollScheduler {
  private adapters: ProviderAdapter[] = [];
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();

  constructor(private store: EventStore) {}

  add(adapter: ProviderAdapter): void {
    this.adapters.push(adapter);
  }

  async runOnce(): Promise<void> {
    await Promise.all(this.adapters.map((a) => this.pollAdapter(a)));
  }

  start(): void {
    this.stop();
    for (const a of this.adapters) {
      const tick = (): void => {
        void this.pollAdapter(a);
      };
      tick();
      this.timers.set(a.id, setInterval(tick, a.pollIntervalMs));
    }
  }

  stop(): void {
    for (const t of this.timers.values()) clearInterval(t);
    this.timers.clear();
  }

  private async pollAdapter(adapter: ProviderAdapter): Promise<void> {
    try {
      const events = await adapter.pollOnce();
      if (events.length > 0) this.store.appendEvents(events);
      this.store.setProviderState(adapter.id, {
        lastPollAt: new Date(),
        lastError: null,
        authStatus: 'ok',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.store.setProviderState(adapter.id, {
        lastPollAt: new Date(),
        lastError: message,
        authStatus: 'error',
      });
    }
  }
}
