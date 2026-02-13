import http from 'http';
import { WebSocketServer } from 'ws';
import url from 'url';
import net from 'net';

const PORT = process.env.PORT || 10000;
const TOKEN = process.env.VPN_TOKEN || 'dev-token';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, name: 'TGK-vpn' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('TGK-vpn WebSocket tunnel is running');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const { query } = url.parse(req.url, true);
  if (query.token !== TOKEN) {
    ws.close(1008, 'Invalid token');
    return;
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const { host, port = 80, payload } = msg;
      const data = Buffer.from(payload, 'base64');

      const socket = net.createConnection({ host, port }, () => {
        socket.write(data);
      });

      socket.on('data', (chunk) => ws.send(chunk));
      socket.on('error', () => {
        ws.send(JSON.stringify({ error: 'upstream error' }));
        ws.close();
      });
      ws.on('close', () => socket.destroy());
    } catch {
      ws.send(JSON.stringify({ error: 'bad message' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`TGK-vpn listening on ${PORT}`);
});
