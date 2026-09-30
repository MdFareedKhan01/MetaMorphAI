import { useCallback, useEffect, useRef, useState } from 'react';
import { Frame } from '@ps154/shared';
import { getToken, socketUrl } from '../api';

export type StreamStatus = 'connecting' | 'live' | 'reconnecting' | 'disconnected';
const GIVE_UP_AFTER = 6; // consecutive failed connects before the page says the link is down

/**
 * Streams frames after `since`; after a drop, reconnects from the last frame seen.
 * Frames that do not match the shared Frame schema are counted and ignored, never applied.
 */
export function useBatchStream(batchId: string, since: string, onFrame: (f: Frame) => void) {
  const handler = useRef(onFrame);
  handler.current = onFrame;
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [dropped, setDropped] = useState(0);
  const restart = useRef<() => void>(() => {});

  useEffect(() => {
    let last = since;
    let ws: WebSocket | null = null;
    let stopped = false;
    let retry = 0;
    let timer: number | undefined;

    const connect = () => {
      window.clearTimeout(timer);
      if (ws) { ws.onclose = null; ws.close(); } // a replaced socket must not schedule another reconnect
      const socket = new WebSocket(socketUrl(
        `/jobs/${batchId}/stream?since=${encodeURIComponent(last)}&token=${getToken()}`));
      ws = socket;
      socket.onopen = () => { retry = 0; setStatus('live'); };
      socket.onmessage = (e) => {
        let raw: unknown;
        try { raw = JSON.parse(e.data); } catch { setDropped((n) => n + 1); return; }
        const parsed = Frame.safeParse(raw);
        if (!parsed.success) { setDropped((n) => n + 1); return; }
        last = parsed.data.seq;
        handler.current(parsed.data);
      };
      socket.onclose = () => {
        if (stopped || socket !== ws) return;
        retry += 1;
        setStatus(retry >= GIVE_UP_AFTER ? 'disconnected' : 'reconnecting');
        timer = window.setTimeout(connect, Math.min(500 * 2 ** (retry - 1), 8000));
      };
    };
    restart.current = () => { retry = 0; setStatus('connecting'); connect(); };
    connect();
    return () => { stopped = true; window.clearTimeout(timer); ws?.close(); };
  }, [batchId, since]);

  const reconnect = useCallback(() => restart.current(), []);
  return { status, dropped, reconnect };
}
