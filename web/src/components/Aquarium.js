import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Crab } from './Crab';
function Bubble({ left, delay, duration, size }) {
    return (_jsx(motion.div, { style: {
            position: 'absolute',
            left: `${left}%`,
            bottom: 0,
            width: size,
            height: size,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            boxShadow: 'inset -1px -1px 0 rgba(255,255,255,0.4)',
            pointerEvents: 'none',
        }, initial: { y: 0, opacity: 0 }, animate: { y: '-90vh', opacity: [0, 1, 1, 0], x: [0, 6, -6, 0] }, transition: {
            duration,
            delay,
            repeat: Infinity,
            ease: 'linear',
            x: { duration: duration / 2, repeat: Infinity, ease: 'easeInOut', delay },
        } }));
}
function Kelp({ left }) {
    return (_jsx(motion.div, { style: {
            position: 'absolute',
            left: `${left}%`,
            bottom: 0,
            width: 6,
            height: 180,
            background: 'linear-gradient(to top, #1d6b3a, #2da14e 60%, #1d6b3a 100%)',
            borderRadius: '3px',
            transformOrigin: 'bottom center',
            boxShadow: '0 0 12px rgba(45, 161, 78, 0.3)',
        }, animate: { rotate: [-3, 3, -3] }, transition: { duration: 4 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut' } }));
}
export function Aquarium({ mood, crabXPct }) {
    // Stable random bubble layout per mount.
    const bubbles = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
        left: Math.random() * 100,
        delay: i * 0.45,
        duration: 6 + Math.random() * 5,
        size: 4 + Math.round(Math.random() * 8),
    })), []);
    const kelpPositions = useMemo(() => [6, 22, 78, 92], []);
    return (_jsxs("div", { style: {
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, var(--water-top) 0%, var(--water-bot) 100%)',
            overflow: 'hidden',
        }, children: [_jsx(motion.div, { style: {
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(ellipse 60% 30% at 30% 0%, rgba(120,200,255,0.18), transparent 60%), radial-gradient(ellipse 50% 20% at 70% 5%, rgba(120,200,255,0.12), transparent 60%)',
                    mixBlendMode: 'screen',
                }, animate: { opacity: [0.6, 1, 0.7, 1, 0.6] }, transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }), bubbles.map((b, i) => (_jsx(Bubble, { ...b }, i))), kelpPositions.map((l) => (_jsx(Kelp, { left: l }, l))), _jsx("div", { style: {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 40,
                    background: 'repeating-linear-gradient(90deg, #2a3550 0px, #2a3550 6px, #3a4a70 6px, #3a4a70 12px), linear-gradient(to bottom, transparent, #050811 100%)',
                    boxShadow: 'inset 0 8px 12px rgba(0,0,0,0.45)',
                } }), _jsx("div", { style: {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 38,
                    height: 8,
                    background: 'linear-gradient(to bottom, rgba(120,200,255,0.18), transparent)',
                } }), _jsx(motion.div, { style: { position: 'absolute', bottom: 18, pointerEvents: 'none' }, animate: { left: `calc(${crabXPct}% - 96px)` }, transition: { type: 'spring', stiffness: 30, damping: 18 }, children: _jsx(Crab, { mood: mood, scale: 6 }) })] }));
}
