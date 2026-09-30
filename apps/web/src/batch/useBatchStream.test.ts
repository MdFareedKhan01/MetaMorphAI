import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBatchStream } from './useBatchStream';

/** Stands in for the browser WebSocket, so the test controls every open, frame and drop. */
class FakeSocket {
  static opened: FakeSocket[] = [];
  onopen?: () => void;
  onmessage?: (e: { data: string }) => void;
  onclose?: () => void;
  constructor(public url: string) { FakeSocket.opened.push(this); }
  close() { this.onclose?.(); }
  send(frame: object) { this.onmessage?.({ data: JSON.stringify(frame) }); }
}

describe('useBatchStream (AC-13)', () => {
  beforeEach(() => {
    FakeSocket.opened = [];
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FakeSocket);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('reconnects after a drop from the last seq it saw', async () => {
    const onFrame = vi.fn();
    const { unmount } = renderHook(() => useBatchStream('b1', '0', onFrame));
    const first = FakeSocket.opened[0];
    expect(first.url).toContain('/jobs/b1/stream?since=0');

    first.send({ event: 'task.progress', seq: '1727-3', task_id: 't1', status: 'running' });
    first.onclose?.(); // the network drops
    await vi.advanceTimersByTimeAsync(600);

    expect(onFrame).toHaveBeenCalledOnce();
    expect(FakeSocket.opened).toHaveLength(2);
    expect(FakeSocket.opened[1].url).toContain('since=1727-3');

    unmount(); // closing on unmount must not reconnect
    await vi.advanceTimersByTimeAsync(10_000);
    expect(FakeSocket.opened).toHaveLength(2);
  });

  it('reports its state, and skips a frame that does not match the shared schema', () => {
    const onFrame = vi.fn();
    const { result } = renderHook(() => useBatchStream('b1', '0', onFrame));
    expect(result.current.status).toBe('connecting');
    const ws = FakeSocket.opened[0];

    act(() => ws.onopen?.());
    expect(result.current.status).toBe('live');

    act(() => {
      ws.onmessage?.({ data: '{oops' });
      ws.send({ event: 'task.completed', seq: '1-0', task_id: 't1', artifact: { nope: true } });
      ws.send({ event: 'task.progress', seq: '2-0', task_id: 't1', status: 'running' });
    });
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(result.current.dropped).toBe(2);

    act(() => ws.onclose?.());
    expect(result.current.status).toBe('reconnecting');
  });
});
