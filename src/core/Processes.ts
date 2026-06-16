import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { platform } from 'node:os';
import { basename } from 'node:path';
import type { ProviderId } from './types';

const IS_WINDOWS = platform() === 'win32';

// Detect running coding-agent CLI instances on this machine. Uses `pgrep -f`
// to find processes whose argv contains a standalone agent token (so the
// macOS Claude.app and its helper soup are skipped — they live under
// `/Applications/Claude.app/Contents/...`). For each match we read the
// working directory via `lsof -d cwd` and group by CWD so subagent
// children fold into their parent session.

export interface ClaudeCliInstance {
  /** Which agent this is (claude / codex / ...) — added for v2 multi-provider. */
  provider?: ProviderId;
  cwd: string;
  project: string; // basename of cwd
  pids: number[];
  startedAt: number | null; // ms epoch of the earliest pid in this CWD
}

// ── shared helpers ────────────────────────────────────────────────────────

function pgrepRegex(regex: string): number[] {
  let out: string;
  try {
    out = execFileSync('pgrep', ['-f', regex], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return [];
  }
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
}

function lsofCwd(pid: number): string | null {
  try {
    const out = execFileSync('lsof', ['-p', String(pid), '-a', '-d', 'cwd', '-Fn'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const line = out.split('\n').find((l) => l.startsWith('n'));
    return line ? line.slice(1) : null;
  } catch {
    return null;
  }
}

function processStartMs(pid: number): number | null {
  try {
    const out = execFileSync('ps', ['-o', 'lstart=', '-p', String(pid)], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!out) return null;
    const ms = new Date(out).getTime();
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

function processCommand(pid: number): string {
  try {
    return execFileSync('ps', ['-o', 'command=', '-p', String(pid)], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function groupByCwd(
  pids: number[],
  filter: (command: string) => boolean,
  provider: ProviderId,
): ClaudeCliInstance[] {
  if (pids.length === 0) return [];
  const byCwd = new Map<string, { pids: number[]; starts: number[] }>();
  for (const pid of pids) {
    const cmd = processCommand(pid);
    if (!filter(cmd)) continue;
    const cwd = lsofCwd(pid);
    if (!cwd) continue;
    const start = processStartMs(pid);
    const entry = byCwd.get(cwd) ?? { pids: [], starts: [] };
    entry.pids.push(pid);
    if (start !== null) entry.starts.push(start);
    byCwd.set(cwd, entry);
  }
  return [...byCwd.entries()]
    .map(([cwd, v]) => ({
      provider,
      cwd,
      project: basename(cwd),
      pids: v.pids.sort((a, b) => a - b),
      startedAt: v.starts.length > 0 ? Math.min(...v.starts) : null,
    }))
    .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
}

// ── Claude CLI detection ──────────────────────────────────────────────────

const CLAUDE_REGEX = '(^|/)claude($| )';

function isLikelyClaudeCli(command: string): boolean {
  if (command.includes('/Applications/Claude.app/')) return false;
  if (command.includes('Claude Helper')) return false;
  if (command.includes('/dist/signal')) return false;
  if (command.includes('src/index.ts serve')) return false;
  return /(^claude\b)|(\/claude(\s|$))/.test(command);
}

export function detectClaudeCliInstances(): ClaudeCliInstance[] {
  if (IS_WINDOWS) return detectWindowsCli('claude', 'claude');
  return groupByCwd(pgrepRegex(CLAUDE_REGEX), isLikelyClaudeCli, 'claude');
}

// ── Codex CLI detection ───────────────────────────────────────────────────

const CODEX_REGEX = '(^|/)codex($| )';

function isLikelyCodexCli(command: string): boolean {
  // Exclude any unrelated 'codex' binaries on the system (rare). The Codex
  // CLI is installed via npm and runs through node or as a direct bin link.
  // Most invocations match `/usr/local/bin/codex` or `~/.nvm/.../bin/codex`
  // or `node .../codex/dist/cli.js`. Require the literal `codex` token.
  if (command.includes('/dist/signal')) return false;
  return /(^codex\b)|(\/codex(\s|$))|(codex\/dist\/cli)/.test(command);
}

export function detectCodexCliInstances(): ClaudeCliInstance[] {
  if (IS_WINDOWS) return detectWindowsCli('codex', 'codex');
  return groupByCwd(pgrepRegex(CODEX_REGEX), isLikelyCodexCli, 'codex');
}

// ── Windows detection ─────────────────────────────────────────────────────
//
// macOS/Linux use pgrep + lsof, which don't exist on Windows. Reading another
// process's CWD on Windows requires reading its PEB via NtQueryInformationProcess,
// which needs P/Invoke or admin — neither is appropriate here. So we trade
// per-CWD grouping for a single aggregate entry per provider showing how many
// PIDs are alive and the oldest start time. Honest about the limitation, still
// useful as a "yes, you have N claude sessions running right now" signal.

function detectWindowsCli(tokenLowercase: string, provider: ProviderId): ClaudeCliInstance[] {
  // Filter on Win32_Process.CommandLine matching the agent token. Permissive
  // by design — false-positive bloat is cheap; a missed real process is what
  // hurts. PowerShell's -match is case-insensitive by default.
  const script = `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -match '\\\\${tokenLowercase}(\\.exe|\\.cmd|\\.bat|\\.ps1)?(\\s|$|"|'')' -and $_.CommandLine -notmatch 'signal.*serve' } | Select-Object ProcessId, CreationDate | ConvertTo-Json -Compress`;
  let out: string;
  try {
    out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return [];
  }
  const trimmed = out.trim();
  if (!trimmed) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  // Single match returns an object; multiple → array. Normalize.
  const rows = (Array.isArray(parsed) ? parsed : [parsed]) as Array<{
    ProcessId?: number;
    CreationDate?: string | { value?: string };
  }>;
  const pids = rows
    .map((r) => r.ProcessId)
    .filter((p): p is number => typeof p === 'number' && p > 0)
    .sort((a, b) => a - b);
  if (pids.length === 0) return [];

  const starts = rows
    .map((r) => parseWmiDate(r.CreationDate))
    .filter((n): n is number => n !== null);

  return [
    {
      provider,
      // CWD isn't reachable on Windows without elevation; show the count
      // instead so the UI has something meaningful to render in that slot.
      cwd: `${pids.length} ${provider} process${pids.length === 1 ? '' : 'es'}`,
      project: provider,
      pids,
      startedAt: starts.length > 0 ? Math.min(...starts) : null,
    },
  ];
}

function parseWmiDate(d: string | { value?: string } | undefined): number | null {
  if (!d) return null;
  // CIM serializes either as the raw WMI string "yyyymmddhhmmss.ffffff±zzz"
  // or wrapped in {value: "..."}; handle both.
  const s = typeof d === 'string' ? d : d.value;
  if (!s) return null;
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!m || !m[1] || !m[2] || !m[3] || !m[4] || !m[5] || !m[6]) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return Number.isFinite(t) ? t : null;
}

// ── Aggregate detector ────────────────────────────────────────────────────

/** Detect all known coding-agent CLI processes, tagged by provider.
 *  When SIGNAL_DEMO_PROCESSES points to a JSON file, returns that file's
 *  contents verbatim instead of running pgrep. Useful for screenshots,
 *  tests, and any context where a deterministic process list matters more
 *  than what's actually running on the host. */
export function detectAllCliInstances(): ClaudeCliInstance[] {
  const demoFile = process.env.SIGNAL_DEMO_PROCESSES;
  if (demoFile) {
    try {
      return JSON.parse(readFileSync(demoFile, 'utf-8'));
    } catch {
      // Bad fixture path / malformed JSON → fall through to live detection.
    }
  }
  return [...detectClaudeCliInstances(), ...detectCodexCliInstances()];
}
