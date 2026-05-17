import { cpus, freemem, loadavg, totalmem } from 'node:os';
import type { HwSample } from './types';

interface CpuSnapshot {
  idle: number;
  total: number;
}

function snapshot(): CpuSnapshot[] {
  return cpus().map((c) => {
    const total = c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq;
    return { idle: c.times.idle, total };
  });
}

function diffPct(prev: CpuSnapshot, next: CpuSnapshot): number {
  const idleDiff = next.idle - prev.idle;
  const totalDiff = next.total - prev.total;
  if (totalDiff <= 0) return 0;
  return Math.max(0, Math.min(100, 100 * (1 - idleDiff / totalDiff)));
}

interface SystemInformationModule {
  currentLoad: () => Promise<{ currentLoad: number; cpus: { load: number }[] }>;
  mem: () => Promise<{ active: number; total: number; pressure?: number }>;
  graphics: () => Promise<{ controllers: { utilizationGpu?: number }[] }>;
}

// Module-level lazy promise for optional systeminformation dep.
// Populated once on first use; avoids async constructor.
let siPromise: Promise<SystemInformationModule | null> | null = null;

function loadSi(): Promise<SystemInformationModule | null> {
  if (siPromise === null) {
    siPromise = import('systeminformation')
      .then((m) => m as unknown as SystemInformationModule)
      .catch(() => null);
  }
  return siPromise;
}

export class HardwareSampler {
  private prev: CpuSnapshot[] = snapshot();
  private readonly useSi: boolean;

  constructor(opts: { useSystemInformation?: boolean } = {}) {
    this.useSi = opts.useSystemInformation !== false;
  }

  async sample(): Promise<HwSample> {
    const ts = new Date();
    const si = this.useSi ? await loadSi() : null;

    if (si) {
      const [load, mem, gfx] = await Promise.all([si.currentLoad(), si.mem(), si.graphics()]);
      const gpuPct =
        gfx.controllers.find((c) => typeof c.utilizationGpu === 'number')?.utilizationGpu ?? null;
      const la = loadavg();
      return {
        ts,
        cpuPct: load.currentLoad,
        cpuPerCore: load.cpus.map((c) => c.load),
        memUsedBytes: mem.active,
        memTotalBytes: mem.total,
        memPressurePct: typeof mem.pressure === 'number' ? mem.pressure : null,
        load1m: la[0] ?? 0,
        load5m: la[1] ?? 0,
        load15m: la[2] ?? 0,
        gpuPct,
      };
    }

    // os-module fallback: two snapshots ~100ms apart for a meaningful CPU%.
    await new Promise((r) => setTimeout(r, 100));
    const next = snapshot();
    const perCore = next.map((n, i) => diffPct(this.prev[i] ?? n, n));
    const avg = perCore.length > 0 ? perCore.reduce((a, b) => a + b, 0) / perCore.length : 0;
    this.prev = next;
    const memTotal = totalmem();
    const memUsed = memTotal - freemem();
    const la = loadavg();
    return {
      ts,
      cpuPct: avg,
      cpuPerCore: perCore,
      memUsedBytes: memUsed,
      memTotalBytes: memTotal,
      memPressurePct: null,
      load1m: la[0] ?? 0,
      load5m: la[1] ?? 0,
      load15m: la[2] ?? 0,
      gpuPct: null,
    };
  }
}
