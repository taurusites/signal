import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { motion } from 'framer-motion';
const MOOD_PALETTE = {
    chill: { body: '#3bc6d6', light: '#65d6f5', dark: '#2b88a0' },
    focused: { body: '#d6c93b', light: '#f5e565', dark: '#a0972b' },
    cooking: { body: '#d6713b', light: '#f59465', dark: '#a04f2b' },
    burning: { body: '#d63b3b', light: '#ff6565', dark: '#a02b2b' },
};
// Per-pixel eye/mouth definition — quick swappable face per mood.
const FACES = {
    chill: {
        eyes: [
            { x: 12, y: 12, c: '#fff' },
            { x: 13, y: 13, c: '#0a0d18' },
            { x: 18, y: 12, c: '#fff' },
            { x: 19, y: 13, c: '#0a0d18' },
        ],
        mouth: { x: 14, y: 16, w: 4, h: 1 },
    },
    focused: {
        eyes: [
            { x: 12, y: 12, c: '#fff' },
            { x: 13, y: 12, c: '#0a0d18' },
            { x: 18, y: 12, c: '#fff' },
            { x: 19, y: 12, c: '#0a0d18' },
        ],
        mouth: { x: 13, y: 16, w: 6, h: 1 },
    },
    cooking: {
        eyes: [
            { x: 12, y: 12, c: '#ffd700' },
            { x: 13, y: 13, c: '#0a0d18' },
            { x: 18, y: 12, c: '#ffd700' },
            { x: 19, y: 13, c: '#0a0d18' },
        ],
        mouth: { x: 13, y: 15, w: 6, h: 2 },
    },
    burning: {
        eyes: [
            { x: 12, y: 12, c: '#ff5a6e' },
            { x: 13, y: 13, c: '#fff' },
            { x: 18, y: 12, c: '#ff5a6e' },
            { x: 19, y: 13, c: '#fff' },
        ],
        mouth: { x: 13, y: 15, w: 6, h: 2 },
    },
};
// Frame-by-frame leg positions for the walk cycle — alternates legs up/down.
// Two frames is the minimum that reads as animation.
const LEGS_FRAMES = [
    [
        { x: 8, y: 18, h: 2 },
        { x: 12, y: 18, h: 2 },
        { x: 18, y: 18, h: 2 },
        { x: 22, y: 18, h: 2 },
        { x: 7, y: 20, h: 2 },
        { x: 11, y: 20, h: 2 },
        { x: 19, y: 20, h: 2 },
        { x: 23, y: 20, h: 2 },
    ],
    [
        { x: 8, y: 18, h: 3 },
        { x: 12, y: 19, h: 2 },
        { x: 18, y: 19, h: 2 },
        { x: 22, y: 18, h: 3 },
        { x: 7, y: 21, h: 1 },
        { x: 11, y: 21, h: 1 },
        { x: 19, y: 21, h: 1 },
        { x: 23, y: 21, h: 1 },
    ],
];
function CrabSvg({ mood, frame, blinking }) {
    const p = MOOD_PALETTE[mood];
    const f = FACES[mood];
    const legs = LEGS_FRAMES[frame % LEGS_FRAMES.length] ?? LEGS_FRAMES[0] ?? [];
    return (_jsxs("svg", { viewBox: "0 0 32 32", shapeRendering: "crispEdges", style: { width: '100%', height: '100%', imageRendering: 'pixelated' }, children: [_jsx("rect", { x: "8", y: "10", width: "16", height: "8", fill: p.body }), _jsx("rect", { x: "6", y: "12", width: "2", height: "4", fill: p.body }), _jsx("rect", { x: "24", y: "12", width: "2", height: "4", fill: p.body }), _jsx("rect", { x: "10", y: "8", width: "12", height: "2", fill: p.body }), _jsx("rect", { x: "10", y: "10", width: "2", height: "2", fill: p.light }), _jsx("rect", { x: "20", y: "10", width: "2", height: "2", fill: p.light }), _jsxs("g", { transform: `translate(0 ${frame === 1 ? -0.5 : 0})`, children: [_jsx("rect", { x: "2", y: "14", width: "4", height: "2", fill: p.body }), _jsx("rect", { x: "0", y: "12", width: "2", height: "2", fill: p.body }), _jsx("rect", { x: "0", y: "16", width: "2", height: "2", fill: p.body })] }), _jsxs("g", { transform: `translate(0 ${frame === 0 ? -0.5 : 0})`, children: [_jsx("rect", { x: "26", y: "14", width: "4", height: "2", fill: p.body }), _jsx("rect", { x: "30", y: "12", width: "2", height: "2", fill: p.body }), _jsx("rect", { x: "30", y: "16", width: "2", height: "2", fill: p.body })] }), blinking ? (_jsxs(_Fragment, { children: [_jsx("rect", { x: "12", y: "13", width: "2", height: "1", fill: p.dark }), _jsx("rect", { x: "18", y: "13", width: "2", height: "1", fill: p.dark })] })) : (f.eyes.map((e, i) => (_jsx("rect", { x: e.x, y: e.y, width: "1", height: "1", fill: e.c }, i)))), !blinking ? _jsx("rect", { x: 13, y: 13, width: "0", height: "0" }) : null, _jsx("rect", { x: f.mouth.x, y: f.mouth.y, width: f.mouth.w, height: f.mouth.h, fill: "#0a0d18" }), legs.map((l, i) => (_jsx("rect", { x: l.x, y: l.y, width: "2", height: l.h, fill: i < 4 ? p.body : p.dark }, `leg${i}`)))] }));
}
export function Crab({ mood, scale = 6 }) {
    // Two-frame walk, breathing bob, occasional blink.
    return (_jsx(motion.div, { style: {
            width: 32 * scale,
            height: 32 * scale,
            position: 'relative',
            imageRendering: 'pixelated',
        }, animate: { y: [0, -3, 0] }, transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }, children: _jsx(CrabFrames, { mood: mood }) }));
}
// Inner component that drives the frame state independently so the outer
// breathing motion stays continuous when frame swaps.
function CrabFrames({ mood }) {
    // Use motion's keyframe animation on a CSS variable to drive the frame swap
    // without re-rendering — but simpler: state via an interval is fine here.
    return _jsx(CrabAnimator, { mood: mood });
}
function CrabAnimator({ mood }) {
    return (_jsx(motion.div, { style: { width: '100%', height: '100%' }, animate: { rotate: [0, -1.5, 0, 1.5, 0] }, transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }, children: _jsx(CrabTicker, { mood: mood }) }));
}
// Drives frame and blink state with simple intervals.
import { useEffect, useState } from 'react';
function CrabTicker({ mood }) {
    const [frame, setFrame] = useState(0);
    const [blinking, setBlinking] = useState(false);
    useEffect(() => {
        // Walk cycle: speed depends on mood — burning crabs scuttle.
        const walkMs = mood === 'burning' ? 180 : mood === 'cooking' ? 280 : mood === 'focused' ? 420 : 720;
        const w = setInterval(() => setFrame((f) => 1 - f), walkMs);
        // Blink every 3-6s.
        const b = setInterval(() => {
            setBlinking(true);
            setTimeout(() => setBlinking(false), 140);
        }, 3000 + Math.random() * 3000);
        return () => {
            clearInterval(w);
            clearInterval(b);
        };
    }, [mood]);
    return _jsx(CrabSvg, { mood: mood, frame: frame, blinking: blinking });
}
