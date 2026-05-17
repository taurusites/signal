import { useEffect, useRef, useState } from 'react';
function wsUrl() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
}
export function useSignal() {
    const [snapshot, setSnapshot] = useState(null);
    const [connected, setConnected] = useState(false);
    const [lastError, setLastError] = useState(null);
    const reconnectMs = useRef(500);
    const wsRef = useRef(null);
    const stoppedRef = useRef(false);
    useEffect(() => {
        let timer = null;
        const connect = () => {
            if (stoppedRef.current)
                return;
            try {
                const ws = new WebSocket(wsUrl());
                wsRef.current = ws;
                ws.onopen = () => {
                    setConnected(true);
                    setLastError(null);
                    reconnectMs.current = 500;
                };
                ws.onmessage = (ev) => {
                    try {
                        const payload = JSON.parse(ev.data);
                        setSnapshot(payload);
                    }
                    catch (err) {
                        setLastError(err instanceof Error ? err.message : String(err));
                    }
                };
                ws.onerror = () => setLastError('websocket error');
                ws.onclose = () => {
                    setConnected(false);
                    if (stoppedRef.current)
                        return;
                    // Exponential backoff capped at 8s.
                    const next = Math.min(8000, reconnectMs.current);
                    timer = setTimeout(connect, next);
                    reconnectMs.current = Math.min(8000, reconnectMs.current * 2);
                };
            }
            catch (err) {
                setLastError(err instanceof Error ? err.message : String(err));
                timer = setTimeout(connect, 1000);
            }
        };
        connect();
        return () => {
            stoppedRef.current = true;
            if (timer)
                clearTimeout(timer);
            wsRef.current?.close();
        };
    }, []);
    return { snapshot, connected, lastError };
}
