import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Aquarium } from './components/Aquarium';
import { DataPanel } from './components/DataPanel';
import { moodFromTokens } from './lib/format';
import { useSignal } from './lib/useSignal';
export function App() {
    const { snapshot, connected } = useSignal();
    // The crab strolls slowly across the tank, faster when mood escalates.
    // Position drifts on a sine over a 60s base period.
    const [crabXPct, setCrabXPct] = useState(50);
    const mood = snapshot ? moodFromTokens(snapshot.claude.tokensWindow) : 'chill';
    useEffect(() => {
        const speedMs = mood === 'burning' ? 22_000 : mood === 'cooking' ? 36_000 : mood === 'focused' ? 56_000 : 90_000;
        const start = Date.now();
        const id = setInterval(() => {
            const elapsed = (Date.now() - start) / speedMs;
            const pct = 30 + 40 * (0.5 + 0.5 * Math.sin(elapsed * Math.PI * 2));
            setCrabXPct(pct);
        }, 80);
        return () => clearInterval(id);
    }, [mood]);
    return (_jsxs("div", { style: { position: 'fixed', inset: 0 }, children: [_jsx(Aquarium, { mood: mood, crabXPct: crabXPct }), _jsx(DataPanel, { snapshot: snapshot, connected: connected })] }));
}
