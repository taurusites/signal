import type { ProviderAdapter, ProviderId } from './types';

export class ProviderRegistry {
  private adapters = new Map<ProviderId, ProviderAdapter>();

  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  list(): ProviderAdapter[] {
    return [...this.adapters.values()];
  }

  get(id: ProviderId): ProviderAdapter | undefined {
    return this.adapters.get(id);
  }
}
