import { useEffect, useRef, useState } from 'react';
import type { SignalSnapshot } from './types';

// WebSocket client with reconnect-with-backoff. Connects to the daemon's
// /ws endpoint (proxied to :8787 by vite in dev, served from the daemon
// directly in production).

export interface SignalState {
  snapshot: SignalSnapshot | null;
  connected: boolean;
  lastError: string | null;
  // ms since the last websocket message landed — lets the UI show 'stale' if
  // the server has gone quiet (iOS Safari background throttling, daemon
  // restart, Wi-Fi blip, etc).
  staleMs: number;
}

function wsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

export function useSignal(): SignalState {
  const [snapshot, setSnapshot] = useState<SignalSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [staleMs, setStaleMs] = useState(0);
  const reconnectMs = useRef(500);
  const wsRef = useRef<WebSocket | null>(null);
  const stoppedRef = useRef(false);
  const lastMessageAt = useRef<number>(Date.now());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = (): void => {
      if (stoppedRef.current) return;
      try {
        const ws = new WebSocket(wsUrl());
        wsRef.current = ws;
        ws.onopen = () => {
          setConnected(true);
          setLastError(null);
          reconnectMs.current = 500;
          lastMessageAt.current = Date.now();
          // Pull a snapshot immediately on (re)connect — covers iOS Safari
          // tabs that just woke up.
          fetch('/api/snapshot')
            .then((r) => r.json())
            .then((p: SignalSnapshot) => setSnapshot(p))
            .catch(() => {
              /* ignore — ws will catch up */
            });
        };
        ws.onmessage = (ev) => {
          lastMessageAt.current = Date.now();
          try {
            const payload = JSON.parse(ev.data) as SignalSnapshot;
            setSnapshot(payload);
          } catch (err) {
            setLastError(err instanceof Error ? err.message : String(err));
          }
        };
        ws.onerror = () => setLastError('websocket error');
        ws.onclose = () => {
          setConnected(false);
          if (stoppedRef.current) return;
          const next = Math.min(8000, reconnectMs.current);
          timer = setTimeout(connect, next);
          reconnectMs.current = Math.min(8000, reconnectMs.current * 2);
        };
      } catch (err) {
        setLastError(err instanceof Error ? err.message : String(err));
        timer = setTimeout(connect, 1000);
      }
    };

    // Local 1s tick — drives countdowns and ages between server messages.
    // Also forces a reconnect attempt if the tab woke up after iOS throttling.
    const tick = setInterval(() => {
      const elapsed = Date.now() - lastMessageAt.current;
      setStaleMs(elapsed);
      // If the socket is "open" but we haven't heard in 5s, the iOS Safari
      // tab probably got suspended and the OS killed the WebSocket without
      // firing onclose. Force a re-open.
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && elapsed > 5000) {
        try {
          wsRef.current.close();
        } catch {
          /* ignore */
        }
      }
    }, 1000);

    // Re-connect aggressively when the tab returns to foreground.
    const onVisible = (): void => {
      if (document.visibilityState === 'visible' && !connected) {
        reconnectMs.current = 200;
        if (timer) clearTimeout(timer);
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    connect();
    return () => {
      stoppedRef.current = true;
      if (timer) clearTimeout(timer);
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { snapshot, connected, lastError, staleMs };
}
