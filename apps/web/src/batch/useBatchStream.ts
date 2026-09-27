import { useEffect, useRef } from 'react';
import type { Frame } from '../shared-temp';
import { getToken, socketUrl } from '../api';

/** Streams frames after `since`; after a drop, reconnects from the last frame seen. */
export function useBatchStream(batchId: string, since: string, onFrame: (f: Frame) => void) {
  const handler = useRef(onFrame);
  handler.current = onFrame;

  useEffect(() => {
    let last = since;
    let ws: WebSocket | null = null;
    let stopped = false;
    let retry = 0;
    let timer: number | undefined;

    const connect = () => {
      ws = new WebSocket(socketUrl(
        `/jobs/${batchId}/stream?since=${encodeURIComponent(last)}&token=${getToken()}`));
      ws.onopen = () => { retry = 0; };
      ws.onmessage = (e) => {
        const frame = JSON.parse(e.data) as Frame;
        last = frame.seq;
        handler.current(frame);
      };
      ws.onclose = () => {
        if (!stopped) timer = window.setTimeout(connect, Math.min(500 * 2 ** retry++, 8000));
      };
    };
    connect();
    return () => { stopped = true; window.clearTimeout(timer); ws?.close(); };
  }, [batchId, since]);
}