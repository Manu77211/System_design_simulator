// sysflow/server/supervisor.js
// Manages child processes (workers) for canvas components.
// Spawns, kills, revives, health-checks, and tracks pid/port/status per node.
import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKER_SCRIPT = path.join(__dirname, 'worker.js');

class Supervisor {
  constructor() {
    // nodeId -> { child, port, type, config, status, pid }
    this.processes = new Map();
    this.nextPort = 8001;
    this.logListeners = []; // callbacks for streaming stdout to WS
  }

  // Register a callback to receive worker log lines for terminal streaming
  onLog(callback) {
    this.logListeners.push(callback);
  }

  _emitLog(nodeId, text) {
    for (const cb of this.logListeners) cb(nodeId, text);
  }

  _nextPort() {
    return this.nextPort++;
  }

  spawn(nodeId, type, config = {}) {
    if (this.processes.has(nodeId)) {
      return this.processes.get(nodeId);
    }

    const port = this._nextPort();
    const child = spawn(process.execPath, [WORKER_SCRIPT, type, String(port), nodeId], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    const proc = {
      child,
      port,
      type,
      config,
      status: 'starting',
      pid: child.pid,
      nodeId
    };
    this.processes.set(nodeId, proc);

    // Stream worker stdout/stderr to log listeners (terminal panel) and backend console
    child.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      this._emitLog(nodeId, text);
    });
    child.stderr.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(text);
      this._emitLog(nodeId, text);
    });

    child.on('exit', (code, signal) => {
      proc.status = 'dead';
      this._emitLog(nodeId, `[${nodeId}] Process exited code=${code} signal=${signal}\n`);
    });

    child.on('error', (err) => {
      proc.status = 'dead';
      this._emitLog(nodeId, `[${nodeId}] Process error: ${err.message}\n`);
    });

    // Initial health check after a short delay
    setTimeout(() => this.healthCheck(nodeId), 300);

    return { port, pid: child.pid, status: proc.status };
  }

  kill(nodeId) {
    const proc = this.processes.get(nodeId);
    if (!proc) return false;
    try {
      proc.child.kill('SIGTERM');
    } catch (e) {
      // already gone
    }
    proc.status = 'dead';
    return true;
  }

  revive(nodeId, type, config = {}) {
    this.kill(nodeId);
    // small delay to let port release
    return setTimeout(() => this.spawn(nodeId, type, config), 300);
  }

  healthCheck(nodeId) {
    const proc = this.processes.get(nodeId);
    if (!proc || proc.status === 'dead') return;

    const req = http.get(`http://localhost:${proc.port}/health`, (res) => {
      proc.status = res.statusCode === 200 ? 'healthy' : 'degraded';
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          proc.config = { ...proc.config, ...parsed };
        } catch (_) {}
      });
    });
    req.on('error', () => {
      proc.status = 'dead';
    });
    req.setTimeout(1500, () => {
      req.destroy();
      proc.status = 'dead';
    });
  }

  healthCheckAll() {
    for (const nodeId of this.processes.keys()) {
      this.healthCheck(nodeId);
    }
  }

  getNodes() {
    return Array.from(this.processes.entries()).map(([id, p]) => ({
      id: p.nodeId,
      port: p.port,
      type: p.type,
      status: p.status,
      pid: p.pid
    }));
  }

  getNode(nodeId) {
    const p = this.processes.get(nodeId);
    if (!p) return null;
    return { id: p.nodeId, port: p.port, type: p.type, status: p.status, pid: p.pid };
  }
}

export { Supervisor };
