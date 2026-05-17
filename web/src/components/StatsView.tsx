import { motion } from 'framer-motion';
import { formatAge, formatInr, formatTokens, shortModel } from '../lib/format';
import type { SignalSnapshot } from '../lib/types';

// Pure-data tank. Big numbers, sparkline-style breakdowns, no aquarium
// chrome. Lives on page 2 of the Pager.

interface Props {
  snapshot: SignalSnapshot | null;
}

function Big({ label, value, color = 'var(--neon-cyan)' }: { label: string; value: string; color?: string }): JSX.Element {
  return (
    <div style={{ flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color, textShadow: `0 0 12px ${color}33` }}>
        {value}
      </div>
    </div>
  );
}

export function StatsView({ snapshot }: Props): JSX.Element {
  if (!snapshot?.claude) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--dim)' }}>
        no data yet — start a Claude Code session
      </div>
    );
  }
  const c = snapshot.claude;
  const totalIn = c.buckets.input;
  const totalOut = c.buckets.output;
  const cacheR = c.buckets.cacheRead;
  const cacheW = c.buckets.cacheCreation;
  // Cache savings — what cache-read tokens would have cost as full input.
  // Rough approximation; uses ratio of input to cache-read rate (~10x cheaper).
  const cacheSavedTokensEq = cacheR * 0.9;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'auto',
        padding: '56px 20px 24px',
        background: 'linear-gradient(to bottom, #07101f, #050811)',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Big label="5h cost" value={formatInr(c.costInr)} />
          <Big label="5h tokens" value={formatTokens(c.tokensWindow)} color="var(--neon-pink)" />
          <Big label="last turn" value={formatAge(c.latestAgeMs)} color="var(--neon-lime)" />
        </div>

        {/* Token-flow chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1 }}>
            token flow (5h)
          </div>
          {([
            { label: 'input', val: totalIn, color: '#6fff8a' },
            { label: 'output', val: totalOut, color: 'var(--neon-cyan)' },
            { label: 'cache w', val: cacheW, color: 'var(--neon-pink)' },
            { label: 'cache r', val: cacheR, color: 'var(--neon-yellow)' },
          ] as const).map((row) => {
            const max = Math.max(totalIn, totalOut, cacheR, cacheW, 1);
            const pct = (row.val / max) * 100;
            return (
              <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '76px 1fr 80px', gap: 8, alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--dim)' }}>{row.label}</div>
                <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    style={{ height: '100%', background: row.color, boxShadow: `0 0 12px ${row.color}` }}
                  />
                </div>
                <div style={{ fontSize: 11, textAlign: 'right' }}>{formatTokens(row.val)}</div>
              </div>
            );
          })}
        </div>

        {/* Cache-savings call-out */}
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(192,255,0,0.05)',
            border: '1px solid rgba(192,255,0,0.2)',
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          <div style={{ color: 'var(--neon-lime)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
            cache savings
          </div>
          <div style={{ marginTop: 4 }}>
            prompt caching let you reuse{' '}
            <span style={{ fontWeight: 700 }}>{formatTokens(cacheR)}</span> tokens this window — saving roughly{' '}
            <span style={{ color: 'var(--neon-yellow)' }}>
              {formatTokens(Math.round(cacheSavedTokensEq))}
            </span>{' '}
            tokens worth of full input charges
          </div>
        </div>

        {/* Per-model with cost */}
        {c.byModel.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1 }}>
              by model
            </div>
            {c.byModel.map((m) => {
              const top = c.byModel[0]?.tokens ?? 1;
              const pct = (m.tokens / top) * 100;
              return (
                <div key={m.model} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 80px 80px', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontSize: 12 }}>{shortModel(m.model)}</div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} style={{ height: '100%', background: 'var(--neon-pink)' }} />
                  </div>
                  <div style={{ fontSize: 11, textAlign: 'right', color: 'var(--dim)' }}>{formatTokens(m.tokens)}</div>
                  <div style={{ fontSize: 11, textAlign: 'right', color: 'var(--neon-lime)' }}>{formatInr(m.costInr)}</div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Per-project */}
        {c.byProject.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1 }}>
              by project
            </div>
            {c.byProject.map((p) => {
              const top = c.byProject[0]?.tokens ?? 1;
              const pct = (p.tokens / top) * 100;
              return (
                <div key={p.project} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: 8, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--neon-cyan)' }}>{p.project}</div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
                      <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} style={{ height: '100%', background: 'var(--neon-cyan)' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, textAlign: 'right', color: 'var(--dim)' }}>{formatTokens(p.tokens)}</div>
                  <div style={{ fontSize: 11, textAlign: 'right', color: 'var(--neon-lime)' }}>{formatInr(p.costInr)}</div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
