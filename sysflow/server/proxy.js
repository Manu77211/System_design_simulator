// sysflow/server/proxy.js
// Real HTTP reverse proxy router. Routes incoming requests to the correct
// child process based on canvas topology (nodes + edges).
import http from 'http';

class Proxy {
  constructor(supervisor) {
    this.supervisor = supervisor;
    this.nodes = [];
    this.edges = [];
    this.clientNodes = [];
  }

  setTopology(nodes, edges) {
    this.nodes = nodes || [];
    this.edges = edges || [];
    // Precompute client nodes for ingress routing
    this.clientNodes = this.nodes.filter((n) => n.type === 'client');
  }

  // Given a request path, find the target worker port to forward to.
  // Walks the graph from client nodes following outgoing edges.
  resolveTarget(urlPath) {
    // Build adjacency: source nodeId -> [target nodeIds]
    const adj = new Map();
    for (const e of this.edges) {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source).push(e.target);
    }

    const nodeMap = new Map();
    for (const n of this.nodes) nodeMap.set(n.id, n);

    // Start from client nodes; pick a path toward the target based on path
    // For MVP: route to the first healthy node reachable from a client
    const visited = new Set();
    const queue = [...this.clientNodes.map((n) => n.id)];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);

      const nodeInfo = this.supervisor.getNode(current);
      if (nodeInfo && nodeInfo.status === 'healthy') {
        const n = nodeMap.get(current);
        if (n && (n.type === 'app-server' || n.type === 'sql-database' || n.type === 'redis-cache' || n.type === 'load-balancer')) {
          return nodeInfo;
        }
      }

      const targets = adj.get(current) || [];
      for (const t of targets) {
        const ti = this.supervisor.getNode(t);
        if (ti && ti.status === 'healthy' && !visited.has(t)) {
          queue.push(t);
        }
      }
    }

    // Fallback: any healthy node
    for (const n of this.nodes) {
      const info = this.supervisor.getNode(n.id);
      if (info && info.status === 'healthy') return info;
    }

    return null;
  }

  createServer() {
    return http.createServer((req, res) => {
      const ts = new Date().toISOString().split('T')[1].split('.')[0];
      console.log(`[${ts}] [PROXY] ${req.method} ${req.url}`);

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const target = this.resolveTarget(req.url || '/');
      if (!target) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No healthy backend available' }));
        return;
      }

      const options = {
        hostname: 'localhost',
        port: target.port,
        path: req.url,
        method: req.method,
        headers: req.headers,
        timeout: 5000
      };

      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy error', detail: err.message }));
      });

      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gateway timeout' }));
      });

      req.pipe(proxyReq);
    });
  }
}

export { Proxy };
