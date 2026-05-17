// Mirror of the daemon's ClaudeSummary / HwSample shapes. Keep in lockstep
// with src/core/Aggregator.ts and src/core/types.ts in the parent project.

export type CrabMood = 'chill' | 'focused' | 'cooking' | 'burning';

export interface ModelTotal {
  model: string;
  tokens: number;
  costInr: number;
}

export interface ProjectTotal {
  project: string;
  tokens: number;
  costInr: number;
  models: string[];
}

export interface RecentTurn {
  ts: number; // ms epoch (serialized over the wire)
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  project: string;
}

export interface ClaudeSummary {
  tokensWindow: number;
  buckets: { input: number; output: number; cacheCreation: number; cacheRead: number };
  costInr: number;
  windowStartMs: number | null;
  resetsAtMs: number | null;
  byModel: ModelTotal[];
  byProject: ProjectTotal[];
  recent: RecentTurn[];
  currentProject: string | null;
  currentModel: string | null;
  latestAgeMs: number | null;
}

export interface HwSnapshot {
  cpuPct: number;
  cpuPerCore: number[];
  memUsedBytes: number;
  memTotalBytes: number;
  load1m: number;
  load5m: number;
  load15m: number;
  gpuPct: number | null;
}

export interface SignalSnapshot {
  generatedAt: string;
  claude: ClaudeSummary;
  hardware: HwSnapshot;
}
