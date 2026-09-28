import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { redis } from './db';
import { verifyToken } from './auth';

const PATH = /^\/api\/v1\/jobs\/([\w-]+)\/stream$/;

export function attachStream(server: Server) {
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const match = url.pathname.match(PATH);
    // Browsers cannot set headers on a WebSocket, so the token travels in the query string.
    const user = verifyToken(url.searchParams.get('token'));
    if (!match || !user) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) =>
      pump(ws, match[1], url.searchParams.get('since') || '0')
    );
  });
}

/** Forward every stream entry after `since` to this socket until it closes. */
async function pump(ws: WebSocket, batch_id: string, since: string) {
  const reader = redis.duplicate(); // XREAD BLOCK holds its connection: never share it
  let open = true;
  ws.on('close', () => {
    open = false;
    reader.disconnect();
  });
  let last = since;
  while (open) {
    const res = await reader
      .xread('BLOCK', 15000, 'STREAMS', `stream:${batch_id}`, last)
      .catch(() => null);
    if (!res) continue; // 15 s with no frames, or the socket closed
    for (const [, entries] of res) {
      for (const [id, fields] of entries) {
        last = id;
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ ...JSON.parse(fields[1]), seq: id }));
      }
    }
  }
}
