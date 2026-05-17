import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

// Detect running Claude Code CLI instances on this machine. Uses `pgrep -f`
// to find processes whose argv contains a standalone `claude` token (so the
// macOS Claude.app and its many helpers are skipped — they live under
// `/Applications/Claude.app/Contents/...`). For each match we read the
// working directory via `lsof -d cwd` and group by CWD so subagent
// children fold into their parent session.

export interface ClaudeCliInstance {
  cwd: string;
  project: string; // basename of cwd
  pids: number[];
  startedAt: number | null; // ms epoch of the earliest pid in this CWD
}

const CMD_REGEX = '(^|/)claude($| )';

function pgrepClaude(): number[] {
  let out: string;
  try {
    out = execFileSync('pgrep', ['-f', CMD_REGEX], {
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
    // `ps -o lstart=` returns the start time in a parseable form
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

function isLikelyClaudeCli(command: string): boolean {
  // Exclude the macOS desktop app and its renderer/helper soup.
  if (command.includes('/Applications/Claude.app/')) return false;
  if (command.includes('Claude Helper')) return false;
  // signal itself shouldn't count
  if (command.includes('/dist/signal')) return false;
  if (command.includes('src/index.ts serve')) return false;
  // The CLI is usually `node ...claude` or just `claude`. Require the
  // word `claude` to appear as something that looks like a binary path or
  // bin entry, not just inside a long Electron arg blob.
  // Heuristic: command must contain '/claude' OR start with 'claude'.
  return /(^claude\b)|(\/claude(\s|$))/.test(command);
}

export function detectClaudeCliInstances(): ClaudeCliInstance[] {
  const pids = pgrepClaude();
  if (pids.length === 0) return [];

  // Group by cwd. Filter out non-CLI matches.
  const byCwd = new Map<string, { pids: number[]; starts: number[] }>();
  for (const pid of pids) {
    const cmd = processCommand(pid);
    if (!isLikelyClaudeCli(cmd)) continue;
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
      cwd,
      project: basename(cwd),
      pids: v.pids.sort((a, b) => a - b),
      startedAt: v.starts.length > 0 ? Math.min(...v.starts) : null,
    }))
    .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
}
