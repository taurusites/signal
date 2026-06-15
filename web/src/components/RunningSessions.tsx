import { motion } from 'framer-motion';
import { formatAge } from '../lib/format';
import { type ClaudeCliInstance, type ProjectTotal, projectStatus } from '../lib/types';

interface Props {
  processes: ClaudeCliInstance[];
  projects: ProjectTotal[];
  formatMoney: (rupees: number) => string;
}

// "Running" = an actual `claude` CLI process is alive on the host. We pair
// that with the project's recent JSONL-event freshness to classify each
// row as actively turning vs sitting idle.

export function RunningSessions({ processes, projects, formatMoney }: Props): JSX.Element {
  const now = Date.now();
  const projectMap = new Map(projects.map((p) => [p.project, p]));

  const decorated = processes
    .map((proc) => {
      const data = projectMap.get(proc.project) ?? null;
      const status = data ? projectStatus(data.lastTurnMs, now) : 'idle';
      return { ...proc, data, status };
    })
    // Sort: turning right now first, then most recent activity, then by uptime
    .sort((a, b) => {
      const aFresh = a.data?.lastTurnMs ?? 0;
      const bFresh = b.data?.lastTurnMs ?? 0;
      if (aFresh !== bFresh) return bFresh - aFresh;
      return (b.startedAt ?? 0) - (a.startedAt ?? 0);
    });

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: 'var(--dim)',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
          }}
        >
          running terminals
        </div>
        <div style={{ fontSize: 10, color: 'var(--neon-cyan)' }}>
          ● {processes.length} {processes.length === 1 ? 'process' : 'processes'}
        </div>
      </div>
      {decorated.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--dim)' }}>no claude code CLI sessions running</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {decorated.map((p) => {
            const isLive = p.status === 'live';
            const dotColor = isLive ? 'var(--ok)' : p.status === 'recent' ? 'var(--warn)' : 'var(--dim)';
            return (
              <div
                key={p.cwd}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '12px 1fr auto',
                  gap: 8,
                  alignItems: 'center',
                  padding: '6px 0',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                {isLive ? (
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.85, 1, 0.85] }}
                    transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 999,
                      background: dotColor,
                      boxShadow: `0 0 10px ${dotColor}`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 999,
                      background: dotColor,
                      opacity: 0.85,
                    }}
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: isLive ? 700 : 500,
                      color: isLive ? 'var(--neon-cyan)' : 'var(--text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={p.cwd}
                  >
                    {p.project}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', display: 'flex', gap: 8 }}>
                    <span>
                      uptime{' '}
                      <span style={{ color: 'var(--text)' }}>
                        {p.startedAt ? formatAge(now - p.startedAt) : '—'}
                      </span>
                    </span>
                    {p.data ? (
                      <span>
                        last turn{' '}
                        <span style={{ color: isLive ? 'var(--ok)' : 'var(--text)' }}>
                          {formatAge(now - p.data.lastTurnMs)}
                        </span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--dim)' }}>idle since open</span>
                    )}
                    <span>pid {p.pids[0]}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--neon-lime)', textAlign: 'right' }}>
                  {p.data ? formatMoney(p.data.costInr) : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
