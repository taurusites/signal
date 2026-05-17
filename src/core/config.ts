import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import type { ProviderId } from './types';

export interface SignalConfig {
  enabledProviders: ProviderId[];
  hardware: {
    sampleIntervalMs: number;
    useSystemInformation: boolean;
  };
  dbPath: string;
}

const DEFAULTS: SignalConfig = {
  enabledProviders: ['claude'],
  hardware: { sampleIntervalMs: 2000, useSystemInformation: true },
  dbPath: join(homedir(), '.signal', 'events.db'),
};

export function configDir(): string {
  return join(homedir(), '.signal');
}

export function configPath(): string {
  return join(configDir(), 'config.toml');
}

export function loadConfig(): SignalConfig {
  const path = configPath();
  if (!existsSync(path)) return DEFAULTS;
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = parseToml(raw) as Partial<SignalConfig>;
    return {
      ...DEFAULTS,
      ...parsed,
      hardware: { ...DEFAULTS.hardware, ...(parsed.hardware ?? {}) },
    };
  } catch {
    return DEFAULTS;
  }
}

export function writeDefaultConfig(): void {
  mkdirSync(configDir(), { recursive: true });
  if (!existsSync(configPath())) {
    writeFileSync(configPath(), stringifyToml(DEFAULTS), 'utf-8');
  }
}
