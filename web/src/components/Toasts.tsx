import { AnimatePresence, motion } from 'framer-motion';
import type { Toast } from '../lib/useNotifications';

interface Props {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const KIND_COLOR: Record<Toast['kind'], string> = {
  turn: 'var(--neon-cyan)',
  mood: 'var(--neon-lime)',
  reset: 'var(--neon-pink)',
};

export function Toasts({ toasts, onDismiss }: Props): JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
        maxWidth: 'calc(100% - 32px)',
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.button
            type="button"
            key={t.id}
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            onClick={() => onDismiss(t.id)}
            style={{
              pointerEvents: 'auto',
              minWidth: 240,
              padding: '10px 14px',
              background: 'rgba(10, 13, 24, 0.92)',
              border: `1px solid ${KIND_COLOR[t.kind]}`,
              borderRadius: 8,
              color: 'var(--text)',
              boxShadow: `0 8px 24px rgba(0,0,0,0.45), 0 0 14px ${KIND_COLOR[t.kind]}33`,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ fontSize: 11, color: KIND_COLOR[t.kind], textTransform: 'uppercase', letterSpacing: 1 }}>
              {t.title}
            </div>
            <div style={{ marginTop: 2, fontSize: 13 }}>{t.body}</div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
