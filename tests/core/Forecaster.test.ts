import { describe, expect, test } from 'bun:test';
import { burnRatePerHour, etaToCapMs } from '../../src/core/Forecaster';

describe('Forecaster', () => {
  test('returns null when fewer than two points', () => {
    expect(burnRatePerHour([])).toBeNull();
    expect(burnRatePerHour([{ ts: new Date(), utilization: 10 }])).toBeNull();
  });

  test('computes percent-per-hour from two points', () => {
    const t0 = new Date('2026-05-17T10:00:00Z');
    const t1 = new Date('2026-05-17T11:00:00Z');
    const rate = burnRatePerHour([
      { ts: t0, utilization: 10 },
      { ts: t1, utilization: 30 },
    ]);
    expect(rate).toBeCloseTo(20, 5);
  });

  test('returns null ETA when burn rate is zero or negative', () => {
    expect(etaToCapMs(50, 0)).toBeNull();
    expect(etaToCapMs(50, -5)).toBeNull();
  });

  test('projects ETA correctly at positive burn rate', () => {
    // 50% used, 10%/h burn → 5 hours to 100%
    const eta = etaToCapMs(50, 10);
    expect(eta).toBeCloseTo(5 * 3600_000, -2);
  });
});
