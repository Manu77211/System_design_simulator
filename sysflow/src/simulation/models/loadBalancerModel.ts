export interface ServerTarget {
  id: string;
  healthy: boolean;
  activeConnections: number;
  weight: number;
  responseTimeAvg: number;
}

export type LBAlgorithm = 'round-robin' | 'least-connections' | 'ip-hash' | 'weighted';

export class LoadBalancerModel {
  public id: string;
  public algorithm: LBAlgorithm = 'round-robin';
  private currentIndex: number = 0;
  public totalDispatched: number = 0;
  public failedDispatches: number = 0;

  constructor(id: string, algorithm: LBAlgorithm = 'round-robin') {
    this.id = id;
    this.algorithm = algorithm;
  }

  public selectServer(servers: ServerTarget[], clientIp: string = '127.0.0.1'): ServerTarget | null {
    // Only healthy servers are eligible
    const available = servers.filter((s) => s.healthy);
    if (available.length === 0) {
      this.failedDispatches++;
      return null; // All servers down -> 503
    }

    this.totalDispatched++;

    switch (this.algorithm) {
      case 'least-connections': {
        // Pick server with minimum active connections
        let minServer = available[0];
        for (let i = 1; i < available.length; i++) {
          if (available[i].activeConnections < minServer.activeConnections) {
            minServer = available[i];
          }
        }
        return minServer;
      }

      case 'ip-hash': {
        // Deterministic hash based on client IP
        let hash = 0;
        for (let i = 0; i < clientIp.length; i++) {
          hash = (hash << 5) - hash + clientIp.charCodeAt(i);
          hash |= 0;
        }
        const index = Math.abs(hash) % available.length;
        return available[index];
      }

      case 'weighted': {
        const totalWeight = available.reduce((acc, s) => acc + (s.weight || 1), 0);
        let random = Math.random() * totalWeight;
        for (const server of available) {
          random -= server.weight || 1;
          if (random <= 0) return server;
        }
        return available[0];
      }

      case 'round-robin':
      default: {
        const server = available[this.currentIndex % available.length];
        this.currentIndex = (this.currentIndex + 1) % available.length;
        return server;
      }
    }
  }

  public reset(): void {
    this.currentIndex = 0;
    this.totalDispatched = 0;
    this.failedDispatches = 0;
  }
}
