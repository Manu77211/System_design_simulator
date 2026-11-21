// sysflow/src/simulation/liveClient.ts
// Frontend client for the Phase 3 live backend (Supervisor + Proxy + WebSocket).
// Connects to the Node.js backend to spawn/kill real worker processes and stream logs.

const API_BASE = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

export interface LiveNode {
  id: string;
  port: number;
  type: string;
  status: string;
  pid: number;
}

export interface LiveLog {
  nodeId: string;
  text: string;
}

class LiveClient {
  private ws: WebSocket | null = null;
  private logListeners: Array<(log: LiveLog) => void> = [];
  private connected = false;
  private reconnectTimer: any = null;

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    try {
      this.ws = new WebSocket(WS_URL);
      this.ws.onopen = () => {
        this.connected = true;
        console.log('[SysFlow Live] Connected to backend');
        this.reconnectTimer = null;
      };
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'log' && msg.nodeId && msg.text) {
            for (const cb of this.logListeners) cb({ nodeId: msg.nodeId, text: msg.text });
          }
        } catch (_) {}
      };
      this.ws.onclose = () => {
        this.connected = false;
        this.ws = null;
        // Reconnect after 3 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => this.connect(), 3000);
        }
      };
      this.ws.onerror = () => {
        this.connected = false;
      };
    } catch (e) {
      console.error('[SysFlow Live] WS connect error', e);
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  isConnected() {
    return this.connected;
  }

  onLog(cb: (log: LiveLog) => void) {
    this.logListeners.push(cb);
  }

  async getNodes(): Promise<LiveNode[]> {
    const res = await fetch(`${API_BASE}/api/nodes`);
    return res.json();
  }

  async spawnNode(nodeId: string, type: string, config: Record<string, any> = {}): Promise<{ port: number; pid: number; status: string }> {
    const res = await fetch(`${API_BASE}/api/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId, type, config })
    });
    return res.json();
  }

  async killNode(nodeId: string): Promise<void> {
    await fetch(`${API_BASE}/api/nodes/${encodeURIComponent(nodeId)}`, { method: 'DELETE' });
  }

  async setTopology(nodes: Array<{ id: string; type: string }>, edges: Array<{ source: string; target: string }>): Promise<void> {
    await fetch(`${API_BASE}/api/topology`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes, edges })
    });
  }

  async healthCheck(): Promise<void> {
    await fetch(`${API_BASE}/api/healthcheck`, { method: 'POST' });
  }
}

export const liveClient = new LiveClient();
