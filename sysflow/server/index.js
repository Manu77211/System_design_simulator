// sysflow/server/index.js
// Backend entry point for Phase 3: Live Process Cluster.
// - HTTP API: spawn/kill/list worker processes
// - WebSocket: stream worker logs to terminal panel
// - HTTP Proxy: reverse-proxy requests to workers based on topology
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Supervisor } from './supervisor.js';
import { Proxy } from './proxy.js';

const supervisor = new Supervisor();
const proxy = new Proxy(supervisor);

// Stream worker logs to all connected WebSocket clients
supervisor.onLog((nodeId, text) => {
  // Also echo to backend terminal so you see live worker output locally
  process.stdout.write(text);
  const message = JSON.stringify({ type: 'log', nodeId, text });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
});

// Periodic health checks
setInterval(() => supervisor.healthCheckAll(), 5000);

// ── HTTP API server (port 3001) ──
const apiServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    try {
      if (req.method === 'GET' && url.pathname === '/api/nodes') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(supervisor.getNodes()));
      } else if (req.method === 'POST' && url.pathname === '/api/nodes') {
        const data = JSON.parse(body || '{}');
        if (!data.nodeId || !data.type) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'nodeId and type required' }));
          return;
        }
        const result = supervisor.spawn(data.nodeId, data.type, data.config || {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } else if (req.method === 'DELETE' && url.pathname.startsWith('/api/nodes/')) {
        const nodeId = decodeURIComponent(url.pathname.split('/').pop());
        supervisor.kill(nodeId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } else if (req.method === 'POST' && url.pathname === '/api/topology') {
        const data = JSON.parse(body || '{}');
        proxy.setTopology(data.nodes || [], data.edges || []);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } else if (req.method === 'POST' && url.pathname === '/api/healthcheck') {
        supervisor.healthCheckAll();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

// ── WebSocket server for terminal log streaming (shares apiServer port) ──
const wss = new WebSocketServer({ server: apiServer });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected', message: 'SysFlow live terminal connected' }));
  ws.on('message', () => { }); // no-op, client-to-server messages not needed yet
  ws.on('close', () => { });
});

apiServer.listen(3000, () => {
  console.log('[SysFlow Backend] API + WebSocket listening on http://localhost:3000');
});

// ── HTTP Reverse Proxy server (port 8000) ──
const proxyServer = proxy.createServer();
proxyServer.listen(8000, () => {
  console.log('[SysFlow Backend] HTTP Proxy listening on http://localhost:8000');
});
