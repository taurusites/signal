import { useEffect, useRef, useState } from 'react';
import type { SignalSnapshot } from './types';

// WebSocket client with reconnect-with-backoff. Connects to the daemon's
// /ws endpoint (proxied to :8787 by vite in dev, served from the daemon
// directly in production).

export interface SignalState {
  snapshot: SignalSnapshot | null;
  connected: boolean;
  lastError: string | null;
}

function wsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

export function useSignal(): SignalState {
  const [snapshot, setSnapshot] = useState<SignalSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const reconnectMs = useRef(500);
  const wsRef = useRef<WebSocket | null>(null);
  const stoppedRef = useRef(false);

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
        };
        ws.onmessage = (ev) => {
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
          // Exponential backoff capped at 8s.
          const next = Math.min(8000, reconnectMs.current);
          timer = setTimeout(connect, next);
          reconnectMs.current = Math.min(8000, reconnectMs.current * 2);
        };
      } catch (err) {
        setLastError(err instanceof Error ? err.message : String(err));
        timer = setTimeout(connect, 1000);
      }
    };

    connect();
    return () => {
      stoppedRef.current = true;
      if (timer) clearTimeout(timer);
      wsRef.current?.close();
    };
  }, []);

  return { snapshot, connected, lastError };
}
