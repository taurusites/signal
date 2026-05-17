import type { AuthStatus, ProviderAdapter, UsageEvent } from '../../core/types';
import {
  decodeProjectDirName,
  findClaudeProjectDirs,
  findRecentSessionFiles,
  parseClaudeSession,
} from './jsonl';
import { readClaudeKeychain } from './keychain';
import { RateLimitedError, TokenExpiredError, fetchUsage } from './oauth';

interface ClaudeAdapterOptions {
  // When true, the adapter tries OAuth (requires Keychain ACL grant). When
  // false (default), it reads JSONL only — no keychain access at all.
  useOauth?: boolean;
}

export class ClaudeAdapter implements ProviderAdapter {
  readonly id = 'claude' as const;
  readonly displayName = 'Claude Code';
  // JSONL is local and free; poll every 5s. The TUI also watches the
  // file system for instant updates, so this is just a safety net.
  // When OAuth is enabled, callers should respect Anthropic's ~1 req / 2 min
  // rate limit — the adapter handles 429 backoff internally.
  readonly pollIntervalMs = 5_000;
  private readonly useOauth: boolean;
  private rateLimitedUntilMs = 0;

  constructor(opts: ClaudeAdapterOptions = {}) {
    this.useOauth = opts.useOauth ?? false;
  }

  async detect(): Promise<boolean> {
    return findClaudeProjectDirs().length > 0;
  }

  async authStatus(): Promise<AuthStatus> {
    // JSONL-only mode has no auth concept — it just reads local logs.
    if (!this.useOauth) return { kind: 'ok' };
    const creds = readClaudeKeychain();
    if (!creds) {
      return {
        kind: 'needs_auth',
        remediation:
          'Run `signal auth claude` for the Keychain setup walkthrough, or stay on JSONL-only mode (the default)',
      };
    }
    if (creds.expiresAt < Date.now()) {
      return { kind: 'needs_auth', remediation: 'Token expired — run /login in Claude Code' };
    }
    return { kind: 'ok' };
  }

  async pollOnce(): Promise<UsageEvent[]> {
    const now = Date.now();

    if (this.useOauth) {
      const creds = readClaudeKeychain();
      if (creds && now > this.rateLimitedUntilMs) {
        try {
          const usage = await fetchUsage(creds.accessToken);
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
            this.rateLimitedUntilMs = now + 5 * 60 * 1000;
          } else if (err instanceof TokenExpiredError) {
            throw new Error('Claude OAuth token expired — run /login in Claude Code');
          }
          // Other errors: fall through to JSONL.
        }
      }
    }

    // JSONL path — the default. Aggregate events from the last 5 hours.
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
