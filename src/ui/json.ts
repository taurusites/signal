import { ClaudeAdapter } from '../adapters/claude';
import { EventStore } from '../core/EventStore';
import { burnRatePerHour, etaToCapMs } from '../core/Forecaster';
import { HardwareSampler } from '../core/HardwareSampler';
import { PollScheduler } from '../core/PollScheduler';
import { ProviderRegistry } from '../core/ProviderRegistry';
import { loadConfig, writeDefaultConfig } from '../core/config';

interface OauthRaw {
  source?: string;
  usage?: { fiveHour?: { utilization: number } };
}

export async function runJson(): Promise<void> {
  writeDefaultConfig();
  const cfg = loadConfig();
  const store = new EventStore(cfg.dbPath);
  const registry = new ProviderRegistry();
  const all = [new ClaudeAdapter()];
  for (const a of all) if (cfg.enabledProviders.includes(a.id)) registry.register(a);
  const sched = new PollScheduler(store);
  for (const a of registry.list()) sched.add(a);
  await sched.runOnce();

  const sampler = new HardwareSampler({ useSystemInformation: cfg.hardware.useSystemInformation });
  const hw = await sampler.sample();
  store.appendHwSample(hw);

  const providers = registry.list().map((a) => {
    const events = store.latestEvents(a.id, 20);
    const points = events
      .map((e) => {
        const raw = e.raw as OauthRaw | undefined;
        const util = raw?.source === 'oauth' ? (raw.usage?.fiveHour?.utilization ?? null) : null;
        return util === null ? null : { ts: e.ts, utilization: util };
      })
      .filter((x): x is { ts: Date; utilization: number } => x !== null);
    const burn = burnRatePerHour(points);
    const cur = points[0]?.utilization ?? null;
    const eta = cur !== null && burn !== null ? etaToCapMs(cur, burn) : null;
    const state = store.getProviderState(a.id);
    return {
      id: a.id,
      displayName: a.displayName,
      utilizationPct: cur,
      burnRatePctPerHour: burn,
      etaToCapMs: eta,
      lastError: state?.lastError ?? null,
    };
  });

  const out = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    providers,
    hardware: {
      cpuPct: hw.cpuPct,
      cpuPerCore: hw.cpuPerCore,
      memUsedBytes: hw.memUsedBytes,
      memTotalBytes: hw.memTotalBytes,
      memPressurePct: hw.memPressurePct,
      load1m: hw.load1m,
      load5m: hw.load5m,
      load15m: hw.load15m,
      gpuPct: hw.gpuPct,
    },
  };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  store.close();
}
