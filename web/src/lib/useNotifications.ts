import { useEffect, useRef, useState } from 'react';
import type { RecentTurn, SignalSnapshot } from './types';

export interface Toast {
  id: string;
  kind: 'turn' | 'mood' | 'reset';
  title: string;
  body: string;
  ts: number;
  cost?: number;
}

// Watches the snapshot stream for "new things to announce." Returns the
// current toast queue plus a dismiss function. A turn is "new" if its
// timestamp exceeds the highest we've seen — covers the very-first-mount
// case by seeding from the first snapshot without firing toasts for
// historical turns.

const MAX_TOASTS = 4;
const TOAST_TTL_MS = 5_000;

export function useNotifications(snapshot: SignalSnapshot | null): {
  toasts: Toast[];
  dismiss: (id: string) => void;
} {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenLatestTs = useRef<number | null>(null);
  const seenMood = useRef<string | null>(null);

  // Auto-dismiss toasts after TTL.
  useEffect(() => {
    if (toasts.length === 0) return;
    const earliest = Math.min(...toasts.map((t) => t.ts));
    const dueIn = TOAST_TTL_MS - (Date.now() - earliest);
    const tid = setTimeout(() => {
      setToasts((ts) => ts.filter((t) => Date.now() - t.ts < TOAST_TTL_MS));
    }, Math.max(50, dueIn));
    return () => clearTimeout(tid);
  }, [toasts]);

  useEffect(() => {
    if (!snapshot?.claude) return;
    const recent = snapshot.claude.recent;
    if (recent.length === 0) return;
    const newest = recent[0] as RecentTurn;
    const newestTs = newest.ts;

    // Seed on first run — don't flood the user with backlog turns.
    if (seenLatestTs.current === null) {
      seenLatestTs.current = newestTs;
      return;
    }

    if (newestTs > seenLatestTs.current) {
      // Find every turn newer than what we've seen.
      const fresh = recent.filter((r) => r.ts > (seenLatestTs.current ?? 0));
      seenLatestTs.current = newestTs;
      const newToasts: Toast[] = fresh.slice(0, 3).map((r) => {
        const totalTok = r.inputTokens + r.outputTokens;
        return {
          id: `turn-${r.ts}-${r.inputTokens}`,
          kind: 'turn',
          title: `${shortModelName(r.model)} · ${r.project || 'session'}`,
          body: `${formatK(r.inputTokens)} in → ${formatK(r.outputTokens)} out  ·  ${formatK(totalTok + r.cacheReadTokens)} total`,
          ts: Date.now(),
        };
      });
      setToasts((prev) => [...newToasts, ...prev].slice(0, MAX_TOASTS));
    }
  }, [snapshot]);

  // Mood-change toasts — fires when crab transitions between mood bands.
  useEffect(() => {
    if (!snapshot?.claude) return;
    const tokens = snapshot.claude.tokensWindow;
    const mood = tokens < 500_000 ? 'chill' : tokens < 5_000_000 ? 'focused' : tokens < 20_000_000 ? 'cooking' : 'burning';
    if (seenMood.current === null) {
      seenMood.current = mood;
      return;
    }
    if (mood !== seenMood.current) {
      const titles: Record<typeof mood, string> = {
        chill: 'crab is chillin again',
        focused: 'crab dialing in',
        cooking: 'crab is cooking',
        burning: 'crab on fire',
      };
      const t: Toast = {
        id: `mood-${mood}-${Date.now()}`,
        kind: 'mood',
        title: titles[mood],
        body: `${formatK(tokens)} tokens this window`,
        ts: Date.now(),
      };
      setToasts((prev) => [t, ...prev].slice(0, MAX_TOASTS));
      seenMood.current = mood;
    }
  }, [snapshot]);

  const dismiss = (id: string): void => setToasts((ts) => ts.filter((t) => t.id !== id));
  return { toasts, dismiss };
}

function shortModelName(m: string): string {
  return m.replace(/^claude-/i, '').split('-')[0] ?? m;
}

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
