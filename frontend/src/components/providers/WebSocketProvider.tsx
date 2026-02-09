'use client';

import React from 'react';
import { useAuthStore } from '../../store/auth.store';
import { parseWebSocketMessages, WebSocketEvent } from '../../lib/ws/parse-ws-messages';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected';

interface WebSocketContextValue {
  status: WebSocketStatus;
  subscribe: (listener: (event: WebSocketEvent) => void) => () => void;
  send: (data: unknown) => boolean;
}

const WebSocketContext = React.createContext<WebSocketContextValue | null>(null);

function resolveWebSocketBaseUrl(): string | null {
  const override = process.env.NEXT_PUBLIC_WS_URL;
  if (override) return override;

  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (apiBase && (apiBase.startsWith('http://') || apiBase.startsWith('https://'))) {
    const url = new URL(apiBase);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${url.host}/ws`;
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  return null;
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const token = useAuthStore((s) => s.token);

  const listenersRef = React.useRef(new Set<(event: WebSocketEvent) => void>());
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = React.useRef<number | undefined>(undefined);
  const reconnectAttemptRef = React.useRef(0);
  const disposedRef = React.useRef(false);

  const [status, setStatus] = React.useState<WebSocketStatus>('disconnected');

  const subscribe = React.useCallback((listener: (event: WebSocketEvent) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const send = React.useCallback((data: unknown) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }, []);

  React.useEffect(() => {
    disposedRef.current = false;

    const clearReconnect = () => {
      if (reconnectTimeoutRef.current !== undefined) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
    };

    const closeSocket = () => {
      const ws = wsRef.current;
      wsRef.current = null;
      if (!ws) return;
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      try {
        ws.close();
      } catch {
        // ignore
      }
    };

    const scheduleReconnect = () => {
      if (disposedRef.current) return;
      if (!token) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      if (reconnectTimeoutRef.current !== undefined) return;

      const attempt = reconnectAttemptRef.current;
      const baseDelay = 500;
      const maxDelay = 30_000;
      const jitter = Math.floor(Math.random() * 250);
      const delay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt)) + jitter;

      reconnectTimeoutRef.current = window.setTimeout(() => {
        reconnectTimeoutRef.current = undefined;
        connect();
      }, delay);

      reconnectAttemptRef.current += 1;
    };

    const connect = () => {
      clearReconnect();
      closeSocket();

      if (!hasHydrated || !token) {
        setStatus('disconnected');
        return;
      }

      const base = resolveWebSocketBaseUrl();
      if (!base) {
        setStatus('disconnected');
        return;
      }

      try {
        const url = new URL(base, window.location.origin);
        url.searchParams.set('token', token);

        setStatus('connecting');
        const ws = new WebSocket(url.toString());
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectAttemptRef.current = 0;
          setStatus('connected');
        };

        ws.onmessage = (event) => {
          const events = parseWebSocketMessages(event.data);
          for (const evt of events) {
            for (const listener of listenersRef.current) {
              try {
                listener(evt);
              } catch {
                // never let a listener break the WS loop
              }
            }
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
          setStatus('disconnected');
          scheduleReconnect();
        };

        ws.onerror = () => {
          // Let onclose drive reconnects.
        };
      } catch {
        setStatus('disconnected');
        scheduleReconnect();
      }
    };

    const handleOnline = () => {
      if (!token) return;
      connect();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    connect();

    return () => {
      disposedRef.current = true;
      clearReconnect();
      closeSocket();
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
  }, [hasHydrated, token]);

  const value = React.useMemo<WebSocketContextValue>(
    () => ({
      status,
      subscribe,
      send,
    }),
    [status, subscribe, send]
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  const ctx = React.useContext(WebSocketContext);
  if (!ctx) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return ctx;
}
