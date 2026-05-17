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
  claude: {
    // Default: false. Reading Claude's keychain entry requires a macOS
    // Keychain Access ACL grant per binary, which is hostile UX. JSONL gives
    // us tokens / models / projects / sessions — only the exact 5h
    // utilization% and reset timer require OAuth. Run `signal auth claude`
    // to opt in.
    useOauth: boolean;
  };
  dbPath: string;
}

const DEFAULTS: SignalConfig = {
  enabledProviders: ['claude'],
  hardware: { sampleIntervalMs: 2000, useSystemInformation: true },
  claude: { useOauth: false },
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
      claude: { ...DEFAULTS.claude, ...(parsed.claude ?? {}) },
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

export function setClaudeUseOauth(value: boolean): void {
  const current = loadConfig();
  const next: SignalConfig = { ...current, claude: { ...current.claude, useOauth: value } };
  mkdirSync(configDir(), { recursive: true });
  writeFileSync(configPath(), stringifyToml(next), 'utf-8');
}
