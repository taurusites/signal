import { type PanInfo, motion } from 'framer-motion';
import { useState } from 'react';

interface PagerProps {
  pages: Array<{ id: string; label: string; content: React.ReactNode }>;
  initialIndex?: number;
}

// Horizontal swipe pager. On phone, swipe with finger. On desktop, click
// the dot indicators or use the arrow keys. Each page is full-width so
// the slide is a simple translateX driven by the active index.

const SWIPE_THRESHOLD_PX = 60;

export function Pager({ pages, initialIndex = 0 }: PagerProps): JSX.Element {
  const [index, setIndex] = useState(initialIndex);

  const handleDragEnd = (_: unknown, info: PanInfo): void => {
    if (info.offset.x < -SWIPE_THRESHOLD_PX && index < pages.length - 1) {
      setIndex(index + 1);
    } else if (info.offset.x > SWIPE_THRESHOLD_PX && index > 0) {
      setIndex(index - 1);
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={{ x: `${-index * 100}%` }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        style={{
          display: 'flex',
          width: `${pages.length * 100}%`,
          height: '100%',
          touchAction: 'pan-y',
        }}
      >
        {pages.map((p) => (
          <div
            key={p.id}
            style={{ width: `${100 / pages.length}%`, height: '100%', position: 'relative', flexShrink: 0 }}
          >
            {p.content}
          </div>
        ))}
      </motion.div>

      {/* Page indicator dots */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 6,
          zIndex: 10,
          background: 'rgba(10,13,24,0.6)',
          padding: '6px 10px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {pages.map((p, i) => (
          <button
            type="button"
            key={p.id}
            onClick={() => setIndex(i)}
            aria-label={`go to ${p.label}`}
            style={{
              width: i === index ? 18 : 6,
              height: 6,
              padding: 0,
              borderRadius: 3,
              border: 0,
              background: i === index ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.25)',
              boxShadow: i === index ? '0 0 8px var(--neon-cyan)' : undefined,
              cursor: 'pointer',
              transition: 'width 0.25s ease',
            }}
            title={p.label}
          />
        ))}
      </div>

      {/* Bottom page-name tag */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 16,
          fontSize: 10,
          color: 'var(--dim)',
          textTransform: 'uppercase',
          letterSpacing: 1,
          zIndex: 10,
        }}
      >
        {pages[index]?.label}
      </div>
    </div>
  );
}
