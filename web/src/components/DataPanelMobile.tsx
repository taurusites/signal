import { AnimatePresence, motion } from 'framer-motion';
import {
  formatAge,
  formatClock,
  formatCountdown,
  formatInr,
  formatTokens,
  intensityPct,
  sessionProgressPct,
  shortModel,
} from '../lib/format';
import type { Currency } from '../lib/layout';
import type { SignalSnapshot } from '../lib/types';

// Phone-friendly stacked layout. No dragging, no absolute positioning —
// just a scrollable column of glass cards. Same data, no fuss.

interface Props {
  snapshot: SignalSnapshot | null;
  connected: boolean;
  staleMs: number;
  currency: Currency;
  onToggleCurrency: () => void;
  onMoodHack?: () => void;
  formatMoney: (rupees: number) => string;
}

function Card({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div
      style={{
        background: 'rgba(10, 13, 24, 0.86)',
        border: '1px solid rgba(90, 240, 255, 0.18)',
        borderRadius: 8,
        padding: '14px 16px',
        boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
      }}
    >
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div
      style={{
        fontSize: 10,
        color: 'var(--dim)',
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }): JSX.Element {
  return (
    <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
      <motion.div
        animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        transition={{ duration: 0.5 }}
        style={{ height: '100%', background: color, boxShadow: `0 0 10px ${color}` }}
      />
    </div>
  );
}

function severity(pct: number): string {
  if (pct > 90) return 'var(--crit)';
  if (pct > 70) return 'var(--warn)';
  return 'var(--ok)';
}

export function DataPanelMobile({
  snapshot,
  connected,
  staleMs,
  currency: _currency,
  onToggleCurrency,
  onMoodHack,
  formatMoney,
}: Props): JSX.Element {
  if (!snapshot?.claude) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--dim)', padding: 24 }}>
        {connected ? 'waiting for first poll…' : 'connecting…'}
      </div>
    );
  }

  const fresh = connected && staleMs < 3000;
  const indicator = !connected
    ? { color: 'var(--crit)', label: 'offline' }
    : !fresh
      ? { color: 'var(--warn)', label: `stale ${Math.round(staleMs / 1000)}s` }
      : { color: 'var(--ok)', label: 'live' };
  const c = snapshot.claude;
  const hw = snapshot.hardware;
  const intensity = intensityPct(c.tokensWindow);
  const memPct = hw.memTotalBytes > 0 ? (hw.memUsedBytes / hw.memTotalBytes) * 100 : 0;
  const sessionPct = sessionProgressPct(c.windowStartMs);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        // Leave the bottom 220px of viewport visible so the crab/tank shows.
        bottom: 220,
        overflow: 'auto',
        padding: '52px 14px 14px',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <CardTitle>5h window</CardTitle>
            <div style={{ marginLeft: 'auto', fontSize: 10, color: indicator.color }}>● {indicator.label}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onToggleCurrency}
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: 'var(--neon-cyan)',
                background: 'transparent',
                border: 0,
                padding: 0,
                cursor: 'pointer',
              }}
            >
              {formatMoney(c.costInr)}
            </motion.button>
            <div style={{ fontSize: 12, color: 'var(--dim)' }}>{formatTokens(c.tokensWindow)} tok</div>
          </div>
          <div style={{ marginTop: 8 }}>
            <Bar pct={intensity} color="var(--neon-cyan)" />
          </div>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dim)' }}>
            <div>
              session <span style={{ color: 'var(--neon-lime)' }}>{sessionPct.toFixed(0)}%</span>
            </div>
            <div>
              resets <span style={{ color: 'var(--neon-pink)' }}>{formatCountdown(c.resetsAtMs)}</span> · {formatClock(c.resetsAtMs)}
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>host</CardTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px', gap: 8, alignItems: 'center', rowGap: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--dim)' }}>cpu</div>
            <Bar pct={hw.cpuPct} color={severity(hw.cpuPct)} />
            <div style={{ fontSize: 11, textAlign: 'right' }}>{hw.cpuPct.toFixed(0)}%</div>
            <div style={{ fontSize: 11, color: 'var(--dim)' }}>ram</div>
            <Bar pct={memPct} color={severity(memPct)} />
            <div style={{ fontSize: 11, textAlign: 'right' }}>{memPct.toFixed(0)}%</div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--dim)' }}>
            load {hw.load1m.toFixed(2)} · {hw.load5m.toFixed(2)} · {hw.load15m.toFixed(2)}
            {hw.gpuPct !== null ? ` · gpu ${hw.gpuPct.toFixed(0)}%` : ''}
          </div>
        </Card>

        <Card>
          <CardTitle>token flow</CardTitle>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{formatTokens(c.buckets.input)}</div>
              <div style={{ fontSize: 10, color: 'var(--dim)' }}>input</div>
            </div>
            <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY }} style={{ fontSize: 18, color: 'var(--neon-cyan)' }}>
              →
            </motion.div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--neon-cyan)' }}>{formatTokens(c.buckets.output)}</div>
              <div style={{ fontSize: 10, color: 'var(--dim)' }}>output</div>
            </div>
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dim)' }}>
            <div>cache w {formatTokens(c.buckets.cacheCreation)}</div>
            <div>cache r {formatTokens(c.buckets.cacheRead)}</div>
          </div>
        </Card>

        {c.byModel.length > 0 ? (
          <Card>
            <CardTitle>models</CardTitle>
            {c.byModel.map((m) => {
              const top = c.byModel[0]?.tokens ?? 1;
              const pct = (m.tokens / top) * 100;
              return (
                <div key={m.model} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span>{shortModel(m.model)}</span>
                    <span style={{ color: 'var(--neon-lime)' }}>{formatMoney(m.costInr)}</span>
                  </div>
                  <Bar pct={pct} color="var(--neon-pink)" />
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{formatTokens(m.tokens)} tok</div>
                </div>
              );
            })}
          </Card>
        ) : null}

        {c.byProject.length > 0 ? (
          <Card>
            <CardTitle>projects</CardTitle>
            {c.byProject.map((p) => {
              const top = c.byProject[0]?.tokens ?? 1;
              const pct = (p.tokens / top) * 100;
              return (
                <div key={p.project} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--neon-cyan)' }}>{p.project}</span>
                    <span style={{ color: 'var(--neon-lime)' }}>{formatMoney(p.costInr)}</span>
                  </div>
                  <Bar pct={pct} color="var(--neon-cyan)" />
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
                    {formatTokens(p.tokens)} tok · {p.models.map(shortModel).join(' ')}
                  </div>
                </div>
              );
            })}
          </Card>
        ) : null}

        {c.recent.length > 0 ? (
          <Card>
            <CardTitle>recent turns</CardTitle>
            <AnimatePresence initial={false}>
              {c.recent.slice(0, 6).map((r) => (
                <motion.div
                  key={`${r.ts}-${r.inputTokens}`}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'grid', gridTemplateColumns: '54px 50px 1fr auto', gap: 8, fontSize: 11, padding: '3px 0' }}
                >
                  <span style={{ color: 'var(--dim)' }}>{formatAge(Date.now() - r.ts)}</span>
                  <span>{shortModel(r.model)}</span>
                  <span>
                    <span style={{ color: 'var(--dim)' }}>{formatTokens(r.inputTokens)}</span>{' '}
                    <span style={{ color: 'var(--neon-cyan)' }}>→</span>{' '}
                    <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>{formatTokens(r.outputTokens)}</span>
                  </span>
                  <span style={{ color: 'var(--neon-pink)' }}>{r.project || '—'}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </Card>
        ) : null}

        <motion.button
          type="button"
          onClick={onMoodHack}
          whileTap={{ scale: 0.96 }}
          style={{
            alignSelf: 'center',
            marginTop: 6,
            padding: '6px 14px',
            background: 'rgba(10,13,24,0.85)',
            border: '1px solid rgba(192,255,0,0.3)',
            borderRadius: 999,
            fontSize: 11,
            color: 'var(--neon-lime)',
            cursor: 'pointer',
          }}
        >
          * tap to cycle mood
        </motion.button>
      </div>
    </div>
  );
}

// Suppress unused warning by re-exporting Currency-typed prop name above —
// the field is reserved for future per-card currency overrides.
export const _unused_: undefined = undefined;
