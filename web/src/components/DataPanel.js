import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AnimatePresence, motion } from 'framer-motion';
import { formatAge, formatClock, formatCountdown, formatInr, formatTokens, intensityPct, moodFromTokens, sessionProgressPct, shortModel, } from '../lib/format';
function Card({ children, color = 'cyan' }) {
    return (_jsx("div", { style: {
            background: 'rgba(10, 13, 24, 0.72)',
            border: '1px solid rgba(90, 240, 255, 0.18)',
            boxShadow: `0 0 24px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(${color === 'cyan' ? '90,240,255' : '255,90,240'},0.05)`,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            padding: '12px 14px',
            borderRadius: 6,
            color: 'var(--text)',
        }, children: children }));
}
function Bar({ pct, color }) {
    return (_jsx("div", { style: {
            position: 'relative',
            height: 8,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 2,
            overflow: 'hidden',
        }, children: _jsx(motion.div, { animate: { width: `${Math.max(0, Math.min(100, pct))}%` }, transition: { duration: 0.6, ease: 'easeOut' }, style: {
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                background: color,
                boxShadow: `0 0 12px ${color}`,
            } }) }));
}
function severityColor(pct) {
    if (pct === null)
        return 'var(--dim)';
    if (pct > 90)
        return 'var(--crit)';
    if (pct > 70)
        return 'var(--warn)';
    return 'var(--ok)';
}
export function DataPanel({ snapshot, connected }) {
    if (!snapshot) {
        return (_jsx("div", { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 5 }, children: _jsx(Card, { children: _jsx("div", { style: { color: 'var(--dim)' }, children: connected ? 'waiting for first poll…' : 'connecting to daemon…' }) }) }));
    }
    const claude = snapshot.claude;
    const hw = snapshot.hardware;
    const intensity = intensityPct(claude.tokensWindow);
    const cpuColor = severityColor(hw.cpuPct);
    const memPct = hw.memTotalBytes > 0 ? (hw.memUsedBytes / hw.memTotalBytes) * 100 : 0;
    const memColor = severityColor(memPct);
    const sessionPct = sessionProgressPct(claude.windowStartMs);
    const mood = moodFromTokens(claude.tokensWindow);
    return (_jsxs(_Fragment, { children: [_jsx("div", { style: { position: 'absolute', top: 16, left: 16, zIndex: 5, width: 320 }, children: _jsxs(Card, { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }, children: [_jsx("div", { style: { fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1 }, children: "5h window" }), _jsx("div", { style: { marginLeft: 'auto', fontSize: 11, color: connected ? 'var(--ok)' : 'var(--crit)' }, children: connected ? '● live' : '● offline' })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 10 }, children: [_jsx("div", { style: { fontSize: 32, fontWeight: 700, color: 'var(--neon-cyan)', textShadow: '0 0 12px rgba(90,240,255,0.4)' }, children: formatInr(claude.costInr) }), _jsxs("div", { style: { fontSize: 13, color: 'var(--dim)' }, children: [formatTokens(claude.tokensWindow), " tok"] })] }), _jsx("div", { style: { marginTop: 6 }, children: _jsx(Bar, { pct: intensity, color: "var(--neon-cyan)" }) }), _jsxs("div", { style: { marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--dim)' }, children: [_jsxs("div", { children: ["session ", _jsxs("span", { style: { color: 'var(--neon-lime)' }, children: [sessionPct.toFixed(0), "%"] })] }), _jsxs("div", { children: ["resets in ", _jsx("span", { style: { color: 'var(--neon-pink)' }, children: formatCountdown(claude.resetsAtMs) }), ' ', _jsxs("span", { children: ["(", formatClock(claude.resetsAtMs), ")"] })] })] })] }) }), _jsx("div", { style: { position: 'absolute', top: 16, right: 16, zIndex: 5, width: 240 }, children: _jsxs(Card, { children: [_jsx("div", { style: { fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }, children: "host" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '36px 1fr 36px', alignItems: 'center', columnGap: 8, rowGap: 6 }, children: [_jsx("div", { style: { fontSize: 11, color: 'var(--dim)' }, children: "cpu" }), _jsx(Bar, { pct: hw.cpuPct, color: cpuColor }), _jsxs("div", { style: { fontSize: 11, textAlign: 'right' }, children: [hw.cpuPct.toFixed(0), "%"] }), _jsx("div", { style: { fontSize: 11, color: 'var(--dim)' }, children: "ram" }), _jsx(Bar, { pct: memPct, color: memColor }), _jsxs("div", { style: { fontSize: 11, textAlign: 'right' }, children: [memPct.toFixed(0), "%"] }), _jsx("div", { style: { fontSize: 11, color: 'var(--dim)' }, children: "load" }), _jsxs("div", { style: { gridColumn: '2 / span 2', fontSize: 11 }, children: [hw.load1m.toFixed(2), " \u00B7 ", hw.load5m.toFixed(2), " \u00B7 ", hw.load15m.toFixed(2), hw.gpuPct !== null ? _jsxs("span", { style: { color: 'var(--dim)' }, children: [" \u00B7 gpu ", hw.gpuPct.toFixed(0), "%"] }) : null] })] })] }) }), _jsx("div", { style: { position: 'absolute', top: 200, left: 16, zIndex: 5, width: 320 }, children: _jsxs(Card, { children: [_jsx("div", { style: { fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }, children: "token flow" }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 18, fontWeight: 700 }, children: formatTokens(claude.buckets.input) }), _jsx("div", { style: { fontSize: 10, color: 'var(--dim)' }, children: "input" })] }), _jsx(motion.div, { animate: { x: [0, 6, 0] }, transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }, style: { fontSize: 18, color: 'var(--neon-cyan)' }, children: "\u2192" }), _jsxs("div", { style: { textAlign: 'right' }, children: [_jsx("div", { style: { fontSize: 18, fontWeight: 700, color: 'var(--neon-cyan)' }, children: formatTokens(claude.buckets.output) }), _jsx("div", { style: { fontSize: 10, color: 'var(--dim)' }, children: "output" })] })] }), _jsxs("div", { style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dim)' }, children: [_jsxs("div", { children: ["cache write ", _jsx("span", { style: { color: 'var(--text)' }, children: formatTokens(claude.buckets.cacheCreation) })] }), _jsxs("div", { children: ["cache read ", _jsx("span", { style: { color: 'var(--text)' }, children: formatTokens(claude.buckets.cacheRead) })] })] })] }) }), claude.byModel.length > 0 ? (_jsx("div", { style: { position: 'absolute', top: 160, right: 16, zIndex: 5, width: 240 }, children: _jsxs(Card, { children: [_jsx("div", { style: { fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }, children: "models" }), claude.byModel.slice(0, 4).map((m) => {
                            const topT = claude.byModel[0]?.tokens ?? 1;
                            const pct = (m.tokens / topT) * 100;
                            return (_jsxs("div", { style: { marginBottom: 6 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }, children: [_jsx("span", { children: shortModel(m.model) }), _jsx("span", { style: { color: 'var(--neon-lime)' }, children: formatInr(m.costInr) })] }), _jsx(Bar, { pct: pct, color: "var(--neon-pink)" }), _jsxs("div", { style: { fontSize: 10, color: 'var(--dim)', marginTop: 2 }, children: [formatTokens(m.tokens), " tok"] })] }, m.model));
                        })] }) })) : null, claude.byProject.length > 0 ? (_jsx("div", { style: { position: 'absolute', bottom: 80, left: 16, zIndex: 5, width: 320 }, children: _jsxs(Card, { children: [_jsx("div", { style: { fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }, children: "projects" }), claude.byProject.slice(0, 4).map((p) => {
                            const topT = claude.byProject[0]?.tokens ?? 1;
                            const pct = (p.tokens / topT) * 100;
                            return (_jsxs("div", { style: { marginBottom: 6 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12 }, children: [_jsx("span", { style: { color: 'var(--neon-cyan)' }, children: p.project }), _jsx("span", { style: { color: 'var(--neon-lime)' }, children: formatInr(p.costInr) })] }), _jsx(Bar, { pct: pct, color: "var(--neon-cyan)" }), _jsxs("div", { style: { fontSize: 10, color: 'var(--dim)', marginTop: 2 }, children: [formatTokens(p.tokens), " tok \u00B7 ", p.models.map(shortModel).join(' ')] })] }, p.project));
                        })] }) })) : null, claude.recent.length > 0 ? (_jsx("div", { style: { position: 'absolute', bottom: 80, right: 16, zIndex: 5, width: 280 }, children: _jsxs(Card, { children: [_jsx("div", { style: { fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }, children: "recent turns" }), _jsx(AnimatePresence, { initial: false, children: claude.recent.slice(0, 6).map((r) => (_jsxs(motion.div, { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, transition: { duration: 0.3 }, style: { display: 'grid', gridTemplateColumns: '60px 56px 1fr auto', gap: 8, fontSize: 11, padding: '3px 0' }, children: [_jsx("span", { style: { color: 'var(--dim)' }, children: formatAge(Date.now() - r.ts) }), _jsx("span", { children: shortModel(r.model) }), _jsxs("span", { children: [_jsx("span", { style: { color: 'var(--dim)' }, children: formatTokens(r.inputTokens) }), ' ', _jsx("span", { style: { color: 'var(--neon-cyan)' }, children: "\u2192" }), ' ', _jsx("span", { style: { color: 'var(--neon-cyan)', fontWeight: 700 }, children: formatTokens(r.outputTokens) })] }), _jsx("span", { style: { color: 'var(--neon-pink)' }, children: r.project || '—' })] }, `${r.ts}-${r.inputTokens}`))) })] }) })) : null, _jsx("div", { style: { position: 'absolute', bottom: 16, left: 0, right: 0, display: 'grid', placeItems: 'center', zIndex: 5 }, children: _jsxs("div", { style: {
                        padding: '6px 14px',
                        background: 'rgba(10, 13, 24, 0.85)',
                        border: '1px solid rgba(192, 255, 0, 0.25)',
                        borderRadius: 999,
                        fontSize: 12,
                        color: 'var(--neon-lime)',
                    }, children: ["*", ' ', claude.currentProject
                            ? `${moodLabel(mood)} in ${claude.currentProject} · ${shortModel(claude.currentModel ?? '')} · last turn ${formatAge(claude.latestAgeMs)}`
                            : 'idle'] }) })] }));
}
function moodLabel(m) {
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
