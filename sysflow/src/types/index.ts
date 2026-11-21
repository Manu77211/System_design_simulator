export type ComponentType =
  | 'client'
  | 'load-balancer'
  | 'app-server'
  | 'redis-cache'
  | 'sql-database'
  | 'message-queue'
  | 'api-gateway'
  | 'cdn';

export type NodeHealthStatus = 'healthy' | 'degraded' | 'overloaded' | 'dead';

export interface ComponentMetrics {
  cpuUsage: number;       // 0 to 100%
  memoryUsage: number;    // MB
  activeConnections: number;
  queueDepth: number;
  throughputRps: number;
  errorRate: number;      // 0.0 to 1.0
  avgLatencyMs: number;
}

export interface NodeData extends Record<string, unknown> {
  label: string;
  type: ComponentType;
  status: NodeHealthStatus;
  metrics: ComponentMetrics;
  config: Record<string, any>;
  liveProcess?: {
    pid?: number;
    port?: number;
    active: boolean;
  };
}

export interface RequestParticle {
  id: string;
  edgeId: string;
  sourceId: string;
  targetId: string;
  direction: 'forward' | 'return'; // Forward on upper Request wire, Return on lower Response wire!
  progress: number;       // 0.0 to 1.0
  speed: number;          // progress increment per frame
  status: 'success' | 'slow' | 'error';
  color: string;
  payloadSizeKb: number;
  path: string;
  createdAt: number;
}

export interface GlobalMetrics {
  totalRequests: number;
  totalResponses: number;
  totalResponseErrors: number;
  currentRps: number;
  errorRate: number;
  p50LatencyMs: number;
  p99LatencyMs: number;
  activeConnections: number;
}
