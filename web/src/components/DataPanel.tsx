import { AnimatePresence, motion } from 'framer-motion';
import {
  formatAge,
  formatClock,
  formatCountdown,
  formatInr,
  formatTokens,
  intensityPct,
  moodFromTokens,
  sessionProgressPct,
  shortModel,
} from '../lib/format';
import type { SignalSnapshot } from '../lib/types';

interface Props {
  snapshot: SignalSnapshot | null;
  connected: boolean;
  staleMs?: number;
}

function Card({
  children,
  color = 'cyan',
}: { children: React.ReactNode; color?: string }): JSX.Element {
  return (
    <div
      style={{
        background: 'rgba(10, 13, 24, 0.72)',
        border: '1px solid rgba(90, 240, 255, 0.18)',
        boxShadow: `0 0 24px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(${color === 'cyan' ? '90,240,255' : '255,90,240'},0.05)`,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        padding: '12px 14px',
        borderRadius: 6,
        color: 'var(--text)',
      }}
    >
      {children}
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }): JSX.Element {
  return (
    <div
      style={{
        position: 'relative',
        height: 8,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <motion.div
        animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          background: color,
          boxShadow: `0 0 12px ${color}`,
        }}
      />
    </div>
  );
}

function severityColor(pct: number | null): string {
  if (pct === null) return 'var(--dim)';
  if (pct > 90) return 'var(--crit)';
  if (pct > 70) return 'var(--warn)';
  return 'var(--ok)';
}

export function DataPanel({ snapshot, connected, staleMs = 0 }: Props): JSX.Element {
  const fresh = connected && staleMs < 3000;
  const indicator = !connected
    ? { color: 'var(--crit)', label: 'offline' }
    : !fresh
      ? { color: 'var(--warn)', label: `stale ${Math.round(staleMs / 1000)}s` }
      : { color: 'var(--ok)', label: 'live' };
  if (!snapshot) {
    return (
      <div
        style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 5 }}
      >
        <Card>
          <div style={{ color: 'var(--dim)' }}>
            {connected ? 'waiting for first poll…' : 'connecting to daemon…'}
          </div>
        </Card>
      </div>
    );
  }

  const claude = snapshot.claude;
  const hw = snapshot.hardware;
  const intensity = intensityPct(claude.tokensWindow);
  const cpuColor = severityColor(hw.cpuPct);
  const memPct = hw.memTotalBytes > 0 ? (hw.memUsedBytes / hw.memTotalBytes) * 100 : 0;
  const memColor = severityColor(memPct);
  const sessionPct = sessionProgressPct(claude.windowStartMs);
  const mood = moodFromTokens(claude.tokensWindow);

  return (
    <>
      {/* TOP LEFT — headline cost + session */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 5, width: 320 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--dim)',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              5h window
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: indicator.color }}>
              ● {indicator.label}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: 'var(--neon-cyan)',
                textShadow: '0 0 12px rgba(90,240,255,0.4)',
              }}
            >
              {formatInr(claude.costInr)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--dim)' }}>
              {formatTokens(claude.tokensWindow)} tok
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            <Bar pct={intensity} color="var(--neon-cyan)" />
          </div>
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--dim)',
            }}
          >
            <div>
              session <span style={{ color: 'var(--neon-lime)' }}>{sessionPct.toFixed(0)}%</span>
            </div>
            <div>
              resets in{' '}
              <span style={{ color: 'var(--neon-pink)' }}>
                {formatCountdown(claude.resetsAtMs)}
              </span>{' '}
              <span>({formatClock(claude.resetsAtMs)})</span>
            </div>
          </div>
        </Card>
      </div>

      {/* TOP RIGHT — hardware */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 5, width: 240 }}>
        <Card>
          <div
            style={{
              fontSize: 11,
              color: 'var(--dim)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            host
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr 36px',
              alignItems: 'center',
              columnGap: 8,
              rowGap: 6,
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--dim)' }}>cpu</div>
            <Bar pct={hw.cpuPct} color={cpuColor} />
            <div style={{ fontSize: 11, textAlign: 'right' }}>{hw.cpuPct.toFixed(0)}%</div>

            <div style={{ fontSize: 11, color: 'var(--dim)' }}>ram</div>
            <Bar pct={memPct} color={memColor} />
            <div style={{ fontSize: 11, textAlign: 'right' }}>{memPct.toFixed(0)}%</div>

            <div style={{ fontSize: 11, color: 'var(--dim)' }}>load</div>
            <div style={{ gridColumn: '2 / span 2', fontSize: 11 }}>
              {hw.load1m.toFixed(2)} · {hw.load5m.toFixed(2)} · {hw.load15m.toFixed(2)}
              {hw.gpuPct !== null ? (
                <span style={{ color: 'var(--dim)' }}> · gpu {hw.gpuPct.toFixed(0)}%</span>
              ) : null}
            </div>
          </div>
        </Card>
      </div>

      {/* MIDDLE LEFT — token flow */}
      <div style={{ position: 'absolute', top: 200, left: 16, zIndex: 5, width: 320 }}>
        <Card>
          <div
            style={{
              fontSize: 11,
              color: 'var(--dim)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            token flow
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {formatTokens(claude.buckets.input)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--dim)' }}>input</div>
            </div>
            <motion.div
              animate={{ x: [0, 6, 0] }}
              transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              style={{ fontSize: 18, color: 'var(--neon-cyan)' }}
            >
              →
            </motion.div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--neon-cyan)' }}>
                {formatTokens(claude.buckets.output)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--dim)' }}>output</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: 'var(--dim)',
            }}
          >
            <div>
              cache write{' '}
              <span style={{ color: 'var(--text)' }}>
                {formatTokens(claude.buckets.cacheCreation)}
              </span>
            </div>
            <div>
              cache read{' '}
              <span style={{ color: 'var(--text)' }}>{formatTokens(claude.buckets.cacheRead)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* MIDDLE RIGHT — models */}
      {claude.byModel.length > 0 ? (
        <div style={{ position: 'absolute', top: 160, right: 16, zIndex: 5, width: 240 }}>
          <Card>
            <div
              style={{
                fontSize: 11,
                color: 'var(--dim)',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              models
            </div>
            {claude.byModel.slice(0, 4).map((m) => {
              const topT = claude.byModel[0]?.tokens ?? 1;
              const pct = (m.tokens / topT) * 100;
              return (
                <div key={m.model} style={{ marginBottom: 6 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      marginBottom: 2,
                    }}
                  >
                    <span>{shortModel(m.model)}</span>
                    <span style={{ color: 'var(--neon-lime)' }}>{formatInr(m.costInr)}</span>
                  </div>
                  <Bar pct={pct} color="var(--neon-pink)" />
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
                    {formatTokens(m.tokens)} tok
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      ) : null}

      {/* BOTTOM LEFT — projects */}
      {claude.byProject.length > 0 ? (
        <div style={{ position: 'absolute', bottom: 80, left: 16, zIndex: 5, width: 320 }}>
          <Card>
            <div
              style={{
                fontSize: 11,
                color: 'var(--dim)',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              projects
            </div>
            {claude.byProject.slice(0, 4).map((p) => {
              const topT = claude.byProject[0]?.tokens ?? 1;
              const pct = (p.tokens / topT) * 100;
              return (
                <div key={p.project} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--neon-cyan)' }}>{p.project}</span>
                    <span style={{ color: 'var(--neon-lime)' }}>{formatInr(p.costInr)}</span>
                  </div>
                  <Bar pct={pct} color="var(--neon-cyan)" />
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
                    {formatTokens(p.tokens)} tok · {p.models.map(shortModel).join(' ')}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      ) : null}

      {/* BOTTOM RIGHT — recent feed */}
      {claude.recent.length > 0 ? (
        <div style={{ position: 'absolute', bottom: 80, right: 16, zIndex: 5, width: 280 }}>
          <Card>
            <div
              style={{
                fontSize: 11,
                color: 'var(--dim)',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              recent turns
            </div>
            <AnimatePresence initial={false}>
              {claude.recent.slice(0, 6).map((r) => (
                <motion.div
                  key={`${r.ts}-${r.inputTokens}`}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 56px 1fr auto',
                    gap: 8,
                    fontSize: 11,
                    padding: '3px 0',
                  }}
                >
                  <span style={{ color: 'var(--dim)' }}>{formatAge(Date.now() - r.ts)}</span>
                  <span>{shortModel(r.model)}</span>
                  <span>
                    <span style={{ color: 'var(--dim)' }}>{formatTokens(r.inputTokens)}</span>{' '}
                    <span style={{ color: 'var(--neon-cyan)' }}>→</span>{' '}
                    <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>
                      {formatTokens(r.outputTokens)}
                    </span>
                  </span>
                  <span style={{ color: 'var(--neon-pink)' }}>{r.project || '—'}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </Card>
        </div>
      ) : null}

      {/* BOTTOM CENTER — status chip */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 0,
          right: 0,
          display: 'grid',
          placeItems: 'center',
          zIndex: 5,
        }}
      >
        <div
          style={{
            padding: '6px 14px',
            background: 'rgba(10, 13, 24, 0.85)',
            border: '1px solid rgba(192, 255, 0, 0.25)',
            borderRadius: 999,
            fontSize: 12,
            color: 'var(--neon-lime)',
          }}
        >
          *{' '}
          {claude.currentProject
            ? `${moodLabel(mood)} in ${claude.currentProject} · ${shortModel(claude.currentModel ?? '')} · last turn ${formatAge(claude.latestAgeMs)}`
            : 'idle'}
        </div>
      </div>
    </>
  );
}

function moodLabel(m: ReturnType<typeof moodFromTokens>): string {
  switch (m) {
    case 'chill':
      return 'taking it easy';
    case 'focused':
      return 'in the zone';
    case 'cooking':
      return 'cooking';
    case 'burning':
      return 'on fire';
  }
}
