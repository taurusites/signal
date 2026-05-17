import type { AuthStatus, ProviderAdapter, UsageEvent } from '../../core/types';
import {
  decodeProjectDirName,
  findClaudeProjectDirs,
  findRecentSessionFiles,
  parseClaudeSession,
} from './jsonl';
import { readClaudeKeychain } from './keychain';
import { RateLimitedError, TokenExpiredError, fetchUsage } from './oauth';

export class ClaudeAdapter implements ProviderAdapter {
  readonly id = 'claude' as const;
  readonly displayName = 'Claude Code';
  // Anthropic rate-limits the usage endpoint to ~1 request per 2 minutes.
  // 150s honors that with a small buffer.
  readonly pollIntervalMs = 150_000;
  private rateLimitedUntilMs = 0;

  async detect(): Promise<boolean> {
    return findClaudeProjectDirs().length > 0 || readClaudeKeychain() !== null;
  }

  async authStatus(): Promise<AuthStatus> {
    const creds = readClaudeKeychain();
    if (!creds) {
      return { kind: 'needs_auth', remediation: 'Run /login in Claude Code, then re-run signal' };
    }
    if (creds.expiresAt < Date.now()) {
      return { kind: 'needs_auth', remediation: 'Token expired — run /login in Claude Code' };
    }
    return { kind: 'ok' };
  }

  async pollOnce(): Promise<UsageEvent[]> {
    const now = Date.now();

    // Try OAuth first if we have keychain credentials and aren't currently rate-limited.
    const creds = readClaudeKeychain();
    if (creds && now > this.rateLimitedUntilMs) {
      try {
        const usage = await fetchUsage(creds.accessToken);
        // OAuth returns a snapshot, not a stream. Synthesize one event carrying the
        // utilization payload in `raw`. Token counts are 0 — they're populated by the
        // JSONL fallback when needed.
        return [
          {
            provider: 'claude',
            ts: new Date(now),
            model: null,
            inputTokens: 0,
            outputTokens: 0,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            sessionId: null,
            projectPath: null,
            raw: { source: 'oauth', usage },
          },
        ];
      } catch (err) {
        if (err instanceof RateLimitedError) {
          // 5-minute backoff matches Tokemon's pattern; the API allows ~1 req / 2 min.
          this.rateLimitedUntilMs = now + 5 * 60 * 1000;
        } else if (!(err instanceof TokenExpiredError)) {
          // Network or unexpected error — fall through to JSONL.
        }
      }
    }

    // JSONL fallback: aggregate events from the last 5 hours.
    const sinceMs = now - 5 * 60 * 60 * 1000;
    const events: UsageEvent[] = [];
    for (const dir of findClaudeProjectDirs()) {
      const dirName = dir.split('/').pop() ?? '';
      const projectPath = decodeProjectDirName(dirName);
      for (const file of findRecentSessionFiles(dir, sinceMs)) {
        events.push(...parseClaudeSession(file, projectPath));
      }
    }
    return events;
  }
}
