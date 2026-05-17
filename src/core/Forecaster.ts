export interface UtilizationPoint {
  ts: Date;
  utilization: number;
}

export function burnRatePerHour(points: UtilizationPoint[], windowHours = 2): number | null {
  if (points.length < 2) return null;
  const cutoffMs = Date.now() - windowHours * 3600_000;
  const recent = points.filter((p) => p.ts.getTime() >= cutoffMs);
  // If too few points fall inside the window, use the last two points outright —
  // gives a usable rate even when polling is sparse or just started.
  const window = recent.length >= 2 ? recent : points.slice(-2);
  const first = window[0];
  const last = window[window.length - 1];
  if (!first || !last) return null;
  const hours = (last.ts.getTime() - first.ts.getTime()) / 3600_000;
  if (hours < 0.01) return null;
  return (last.utilization - first.utilization) / hours;
}

export function etaToCapMs(currentUtilization: number, burnRate: number, cap = 100): number | null {
  if (burnRate <= 0) return null;
  const remaining = cap - currentUtilization;
  if (remaining <= 0) return 0;
  return (remaining / burnRate) * 3600_000;
}

export function formatEta(ms: number | null): string {
  if (ms === null) return '—';
  if (ms <= 0) return 'now';
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 24) return '>24h';
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
