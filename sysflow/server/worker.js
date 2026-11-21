// sysflow/server/worker.js
// Spawned as a child process per canvas component.
// Each worker is a small HTTP server on its own port that responds to
// health checks and proxied requests, logging every hit to stdout.
import http from 'http';

const type = process.argv[2];
const port = parseInt(process.argv[3], 10);
const nodeId = process.argv[4];

const server = http.createServer((req, res) => {
  const ts = new Date().toISOString();
  process.stdout.write(`[${ts}] [${nodeId}] ${req.method} ${req.url}\n`);

  // CORS for browser-based proxy/frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', type, nodeId, port }));
    return;
  }

  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ nodeId, type, message: `Hello from ${type} (pid ${process.pid})` }));
    return;
  }

  // Component-aware responses
  let body;
  if (type === 'app-server') {
    body = { nodeId, type, result: `Processed ${req.method} ${req.url}`, cpu: Math.round(Math.random() * 40 + 10) };
  } else if (type === 'sql-database') {
    body = { nodeId, type, result: `Query executed on ${req.url}`, rows: Math.floor(Math.random() * 10) + 1 };
  } else if (type === 'redis-cache') {
    body = { nodeId, type, result: `Cache lookup ${req.url}`, hit: Math.random() > 0.3 };
  } else if (type === 'load-balancer') {
    body = { nodeId, type, result: `Load balanced ${req.method} ${req.url}` };
  } else if (type === 'client') {
    body = { nodeId, type, result: `Client request generated` };
  } else if (type === 'message-queue') {
    body = { nodeId, type, result: `Message enqueued`, queueDepth: Math.floor(Math.random() * 50) };
  } else if (type === 'api-gateway') {
    body = { nodeId, type, result: `Gateway routed ${req.method} ${req.url}`, auth: 'jwt-verified' };
  } else if (type === 'cdn') {
    body = { nodeId, type, result: `Edge cache ${req.url}`, hitRate: 0.82 };
  } else {
    body = { nodeId, type, result: `Handled ${req.method} ${req.url}` };
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
});

server.listen(port, () => {
  process.stdout.write(`[${nodeId}] Worker ${type} listening on port ${port} (pid ${process.pid})\n`);
});

process.on('SIGTERM', () => {
  process.stdout.write(`[${nodeId}] Received SIGTERM, shutting down\n`);
  server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
  process.stderr.write(`[${nodeId}] FATAL: ${err.message}\n`);
  process.exit(1);
});
