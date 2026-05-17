import { useEffect, useState } from 'react';
import { Aquarium } from './components/Aquarium';
import { DataPanel } from './components/DataPanel';
import { moodFromTokens } from './lib/format';
import { useSignal } from './lib/useSignal';

export function App(): JSX.Element {
  const { snapshot, connected, staleMs } = useSignal();

  const [crabXPct, setCrabXPct] = useState(50);
  const mood = snapshot ? moodFromTokens(snapshot.claude.tokensWindow) : 'chill';
  useEffect(() => {
    const speedMs =
      mood === 'burning'
        ? 22_000
        : mood === 'cooking'
          ? 36_000
          : mood === 'focused'
            ? 56_000
            : 90_000;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / speedMs;
      const pct = 30 + 40 * (0.5 + 0.5 * Math.sin(elapsed * Math.PI * 2));
      setCrabXPct(pct);
    }, 80);
    return () => clearInterval(id);
  }, [mood]);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Aquarium mood={mood} crabXPct={crabXPct} />
      <DataPanel snapshot={snapshot} connected={connected} staleMs={staleMs} />
    </div>
  );
}
