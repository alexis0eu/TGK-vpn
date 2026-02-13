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
    let socket;
    try {
      const msg = JSON.parse(raw.toString());
      const { host, port = 80, payload } = msg;
      const data = Buffer.from(payload, 'base64');

      socket = net.createConnection({ host, port }, () => {
        socket.write(data);
      });

      // Всё, что приходит от целевого сервера — сразу в WS
      socket.on('data', (chunk) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(chunk);
        }
      });

      socket.on('end', () => {
        if (ws.readyState === ws.OPEN) ws.close();
      });

      socket.on('error', () => {
        if (ws.readyState === ws.OPEN) ws.close();
      });

      ws.on('close', () => {
        if (socket) socket.destroy();
      });
    } catch (e) {
      if (ws.readyState === ws.OPEN) ws.close();
      if (socket) socket.destroy();
    }
  });
});

server.listen(PORT, () => {
  console.log(`TGK-vpn listening on ${PORT}`);
});
