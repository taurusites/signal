import { describe, expect, test } from 'bun:test';
import { HardwareSampler } from '../../src/core/HardwareSampler';

describe('HardwareSampler', () => {
  test('returns a sane sample using the os fallback', async () => {
    const sampler = new HardwareSampler({ useSystemInformation: false });
    const s = await sampler.sample();
    expect(s.cpuPct).toBeGreaterThanOrEqual(0);
    expect(s.cpuPct).toBeLessThanOrEqual(100);
    expect(s.memTotalBytes).toBeGreaterThan(0);
    expect(s.memUsedBytes).toBeGreaterThanOrEqual(0);
    expect(s.memUsedBytes).toBeLessThanOrEqual(s.memTotalBytes);
    expect(s.cpuPerCore.length).toBeGreaterThan(0);
    expect(typeof s.load1m).toBe('number');
  });
});
