export type SimulationEventType =
  | 'CLIENT_REQUEST'
  | 'LB_DISPATCH'
  | 'SERVER_RECEIVE'
  | 'CACHE_LOOKUP'
  | 'CACHE_RESULT'
  | 'DB_QUERY'
  | 'DB_RESULT'
  | 'SERVER_RESPOND'
  | 'CLIENT_RECEIVE_RESPONSE'
  | 'NODE_HEALTH_CHECK';

export interface SimulationRequest {
  id: string;
  traceId: string;
  clientNodeId: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  key: string;              // e.g. "user:1"
  createdAt: number;
  currentHop: string;       // nodeId
  history: Array<{
    nodeId: string;
    action: string;
    timestamp: number;
    latencyMs: number;
  }>;
  status: 'in-flight' | 'completed' | 'failed';
  errorReason?: string;
}

export interface SimulationEvent {
  id: string;
  timestamp: number;        // virtual time in ms
  type: SimulationEventType;
  sourceNodeId: string;
  targetNodeId: string;
  edgeId?: string;
  payload: any;
}

export interface CacheEntry {
  key: string;
  value: string;
  sizeBytes: number;
  createdAt: number;
  expiresAt: number;
  lastAccessed: number;
  accessCount: number;
}

/** An in-flight packet that physically travels along one edge */
export interface InFlightPacket {
  id: string;
  requestId: string;
  edgeId: string;
  sourceNodeId: string;    // edge source
  targetNodeId: string;    // edge target
  direction: 'forward' | 'return';
  progress: number;        // 0 → 1
  speed: number;           // progress per tick
  color: string;
  status: 'success' | 'slow' | 'error';
  payloadSizeKb: number;
  path: string;
  /** When progress reaches 1, deliver to this callback */
  onArrival?: string;      // used by engine to track
  chaosDelayed?: boolean;  // chaos latency already applied to this packet
  traceId?: string;        // distributed trace id for waterfall view
}

/** A single log line emitted from a node */
export interface SimulationLog {
  id: string;
  wallTime: number;        // Date.now() ms for ordering
  simTime: number;         // virtual time
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  requestId?: string;
}
