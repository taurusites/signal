import type { UsageEvent } from './types';

export interface ModelTotal {
  model: string;
  tokens: number;
}

export interface RecentTurn {
  ts: Date;
  model: string;
  tokens: number;
  project: string;
}

export interface ClaudeSummary {
  // Total tokens across the last 5h window, deduplicated.
  tokensWindow: number;
  // Earliest event timestamp inside the 5h window — used to project the reset.
  windowStartMs: number | null;
  // When the current 5h window resets (windowStartMs + 5h). Null if no events.
  resetsAtMs: number | null;
  // Tokens grouped by model, sorted descending.
  byModel: ModelTotal[];
  // Most recent N unique turns, newest first.
  recent: RecentTurn[];
  // Most recently active project basename ("HAL9000" etc), null if none.
  currentProject: string | null;
  // Model used in the most recent turn, null if none.
  currentModel: string | null;
  // ms since the latest turn, null if none.
  latestAgeMs: number | null;
}

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

function basename(path: string | null): string {
  if (!path) return '';
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

function dedupKey(e: UsageEvent): string {
  return `${e.sessionId ?? ''}|${e.ts.getTime()}|${e.inputTokens}|${e.outputTokens}|${e.cacheCreationTokens}|${e.cacheReadTokens}`;
}

export function aggregateClaude(events: UsageEvent[], now = Date.now()): ClaudeSummary {
  const cutoff = now - FIVE_HOURS_MS;
  const seen = new Set<string>();
  const unique: UsageEvent[] = [];
  for (const e of events) {
    if (e.ts.getTime() < cutoff) continue;
    const key = dedupKey(e);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(e);
  }
  if (unique.length === 0) {
    return {
      tokensWindow: 0,
      windowStartMs: null,
      resetsAtMs: null,
      byModel: [],
      recent: [],
      currentProject: null,
      currentModel: null,
      latestAgeMs: null,
    };
  }

  let tokensWindow = 0;
  const modelMap = new Map<string, number>();
  let windowStartMs = Number.POSITIVE_INFINITY;
  for (const e of unique) {
    const sum = e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens;
    tokensWindow += sum;
    const m = e.model ?? 'unknown';
    modelMap.set(m, (modelMap.get(m) ?? 0) + sum);
    const ts = e.ts.getTime();
    if (ts < windowStartMs) windowStartMs = ts;
  }

  const byModel = [...modelMap.entries()]
    .map(([model, tokens]) => ({ model, tokens }))
    .sort((a, b) => b.tokens - a.tokens);

  const sorted = [...unique].sort((a, b) => b.ts.getTime() - a.ts.getTime());
  const recent: RecentTurn[] = sorted.slice(0, 5).map((e) => ({
    ts: e.ts,
    model: e.model ?? 'unknown',
    tokens: e.inputTokens + e.outputTokens + e.cacheCreationTokens + e.cacheReadTokens,
    project: basename(e.projectPath),
  }));
  const latest = sorted[0];
  return {
    tokensWindow,
    windowStartMs,
    resetsAtMs: windowStartMs + FIVE_HOURS_MS,
    byModel,
    recent,
    currentProject: latest?.projectPath ? basename(latest.projectPath) : null,
    currentModel: latest?.model ?? null,
    latestAgeMs: latest ? now - latest.ts.getTime() : null,
  };
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function formatAge(ms: number | null): string {
  if (ms === null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function formatCountdown(targetMs: number | null, now = Date.now()): string {
  if (targetMs === null) return '—';
  const remaining = targetMs - now;
  if (remaining <= 0) return 'resets now';
  const s = Math.floor(remaining / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function shortModel(model: string): string {
  // Drop the leading "claude-" prefix and the version suffix where possible.
  // "claude-opus-4-7" → "opus", "claude-sonnet-4-6" → "sonnet"
  const m = model.replace(/^claude-/i, '');
  const stem = m.split('-')[0] ?? m;
  return stem.toLowerCase();
}
