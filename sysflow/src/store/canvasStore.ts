import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  addEdge,
  type Connection
} from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/system';
import { ComponentType, NodeData, RequestParticle, GlobalMetrics } from '../types';
import { SimulationEngine } from '../simulation/engine';
import { CacheEntry, InFlightPacket, SimulationLog } from '../simulation/types';
import { liveClient } from '../simulation/liveClient';

interface CanvasState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isPlaying: boolean;
  simulationSpeed: number;
  particles: RequestParticle[];
  globalMetrics: GlobalMetrics;
  mode: 'simulated' | 'live';
  cacheEntries: CacheEntry[];
  logs: SimulationLog[];
  logPanelOpen: boolean;

  // Traffic mode
  trafficMode: 'single' | 'batch' | 'continuous';
  batchCount: number;      // how many to send in batch mode
  continuousRps: number;   // target RPS in continuous mode
  chaosLatency: number;    // chaos monkey: injected latency (ms)
  chaosDrop: number;       // chaos monkey: packet drop rate (0-1)
  traceSpans: Array<{
    traceId: string;
    spanId: string;
    nodeId: string;
    nodeLabel: string;
    action: string;
    startTime: number;
    durationMs: number;
    status: 'success' | 'slow' | 'error';
  }>;

  // React Flow Handlers
  onNodesChange: OnNodesChange<Node<NodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;

  // Canvas Actions
  addNode: (type: ComponentType, position: { x: number; y: number }) => void;
  updateNodeConfig: (id: string, config: Record<string, any>) => void;
  killNode: (id: string) => void;
  reviveNode: (id: string) => void;
  deleteSelectedNode: () => void;
  deleteEdge: (id: string) => void;

  // Simulation Controls
  setIsPlaying: (playing: boolean) => void;
  setSimulationSpeed: (speed: number) => void;
  setMode: (mode: 'simulated' | 'live') => void;
  setTrafficMode: (mode: 'single' | 'batch' | 'continuous') => void;
  setBatchCount: (count: number) => void;
  setContinuousRps: (rps: number) => void;
  setChaos: (latencyMs: number, dropRate: number) => void;

  // Actions
  stepSimulation: () => void;
  triggerSingleRequest: () => void;
  triggerBurst: (count?: number) => void;
  startContinuous: () => void;
  stopTraffic: () => void;
  flushCache: (redisNodeId?: string) => void;
  addCacheKey: (key: string, value: string, ttl: number) => void;
  resetSimulation: () => void;
  toggleLogPanel: () => void;
  clearLogs: () => void;
}

const defaultMetrics = () => ({
  cpuUsage: 2,
  memoryUsage: 45,
  activeConnections: 0,
  queueDepth: 0,
  throughputRps: 0,
  errorRate: 0,
  avgLatencyMs: 0
});

// ─── Default canvas: BLANK (user designs their own topology) ───────────────
const initialNodes: Node<NodeData>[] = [];
const initialEdges: Edge[] = [];

// Template: pre-built 6-node system the user can load
export const TEMPLATE_NODES: Node<NodeData>[] = [
  {
    id: 'client-1', type: 'systemNode', position: { x: 60, y: 220 },
    data: { label: 'Users / Clients', type: 'client', status: 'healthy',
      metrics: { ...defaultMetrics(), throughputRps: 10 },
      config: { rps: 10, pattern: 'constant', requestType: 'GET', endpoint: '/api/data/:id' } }
  },
  {
    id: 'lb-1', type: 'systemNode', position: { x: 340, y: 220 },
    data: { label: 'L7 Load Balancer', type: 'load-balancer', status: 'healthy',
      metrics: { ...defaultMetrics(), throughputRps: 10, cpuUsage: 5 },
      config: { algorithm: 'round-robin', maxConnections: 1000, stickySession: false } }
  },
  {
    id: 'server-1', type: 'systemNode', position: { x: 660, y: 110 },
    data: { label: 'App Server 1', type: 'app-server', status: 'healthy',
      metrics: { ...defaultMetrics(), throughputRps: 5, cpuUsage: 2, memoryUsage: 120 },
      config: { maxWorkers: 8, port: 8001, computeLatencyMs: 5, memoryCeilingMb: 1024 } }
  },
  {
    id: 'server-2', type: 'systemNode', position: { x: 660, y: 330 },
    data: { label: 'App Server 2', type: 'app-server', status: 'healthy',
      metrics: { ...defaultMetrics(), throughputRps: 5, cpuUsage: 2, memoryUsage: 120 },
      config: { maxWorkers: 8, port: 8002, computeLatencyMs: 5, memoryCeilingMb: 1024 } }
  },
  {
    id: 'cache-1', type: 'systemNode', position: { x: 980, y: 110 },
    data: { label: 'Redis Cache', type: 'redis-cache', status: 'healthy',
      metrics: { ...defaultMetrics(), memoryUsage: 0, avgLatencyMs: 0.8 },
      config: { maxMemoryMb: 256, evictionPolicy: 'LRU', ttlSeconds: 60,
        thunderingHerd: false, writeInvalidation: true } }
  },
  {
    id: 'db-1', type: 'systemNode', position: { x: 980, y: 330 },
    data: { label: 'PostgreSQL Primary', type: 'sql-database', status: 'healthy',
      metrics: { ...defaultMetrics(), cpuUsage: 3, avgLatencyMs: 25 },
      config: { maxConnections: 50, baseReadLatencyMs: 20, baseWriteLatencyMs: 40,
        indexMode: 'btree', replicationMode: 'none', replicaLagMs: 0 } }
  }
];

export const TEMPLATE_EDGES: Edge[] = [
  { id: 'e-client-lb', source: 'client-1', target: 'lb-1', type: 'removableEdge' },
  { id: 'e-lb-srv1', source: 'lb-1', target: 'server-1', type: 'removableEdge' },
  { id: 'e-lb-srv2', source: 'lb-1', target: 'server-2', type: 'removableEdge' },
  { id: 'e-srv1-cache', source: 'server-1', target: 'cache-1', type: 'removableEdge' },
  { id: 'e-srv2-cache', source: 'server-2', target: 'cache-1', type: 'removableEdge' },
  { id: 'e-srv1-db', source: 'server-1', target: 'db-1', type: 'removableEdge' },
  { id: 'e-srv2-db', source: 'server-2', target: 'db-1', type: 'removableEdge' }
];

export const engine = new SimulationEngine();

const MAX_LOG_LINES = 500;

// Convert InFlightPacket → RequestParticle (legacy visual format)
function toParticle(p: InFlightPacket): RequestParticle {
  return {
    id: p.id,
    edgeId: p.edgeId,
    sourceId: p.sourceNodeId,
    targetId: p.targetNodeId,
    direction: p.direction,
    progress: p.progress,
    speed: p.speed,
    status: p.status,
    color: p.color,
    payloadSizeKb: p.payloadSizeKb,
    path: p.path.split('::')[1] || p.path,
    createdAt: Date.now()
  };
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNodeId: null,
  selectedEdgeId: null,
  isPlaying: false,
  simulationSpeed: 1,
  particles: [],
  cacheEntries: [],
  logs: [],
  logPanelOpen: false,
  mode: 'simulated',
  trafficMode: 'single',
  batchCount: 10,
  continuousRps: 100,
  chaosLatency: 0,
  chaosDrop: 0,
  traceSpans: [],
  globalMetrics: {
    totalRequests: 0,
    totalResponses: 0,
    totalResponseErrors: 0,
    currentRps: 0,
    errorRate: 0,
    p50LatencyMs: 0,
    p99LatencyMs: 0,
    activeConnections: 0
  },

  onNodesChange: (changes) => set({ nodes: applyNodeChanges(get().nodes, changes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(get().edges, changes) }),
  onConnect: (connection: Connection) =>
    set({ edges: addEdge({ ...connection, type: 'removableEdge' }, get().edges) }),

  setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  addNode: (type, position) => {
    const id = `${type}-${Date.now().toString().slice(-4)}`;
    const titles: Record<ComponentType, string> = {
      'client': 'Users / Clients',
      'load-balancer': 'Load Balancer',
      'app-server': 'Application Server',
      'redis-cache': 'Redis Cache',
      'sql-database': 'SQL Database',
      'message-queue': 'Message Queue',
      'api-gateway': 'API Gateway',
      'cdn': 'CDN Edge'
    };
    const defaultConfigs: Partial<Record<ComponentType, Record<string, any>>> = {
      'client': { rps: 10, requestType: 'GET', pattern: 'constant' },
      'load-balancer': { algorithm: 'round-robin', maxConnections: 1000, stickySession: false },
      'app-server': { maxWorkers: 8, computeLatencyMs: 5, memoryCeilingMb: 1024, port: 8000 + Math.floor(Math.random() * 1000) },
      'redis-cache': { maxMemoryMb: 256, evictionPolicy: 'LRU', ttlSeconds: 60, thunderingHerd: false, writeInvalidation: true },
      'sql-database': { maxConnections: 50, baseReadLatencyMs: 20, baseWriteLatencyMs: 40, indexMode: 'btree', replicationMode: 'none' },
      'message-queue': { maxDepth: 10000, deliveryMode: 'at-least-once' },
      'api-gateway': { rateLimit: 1000, authMode: 'jwt' },
      'cdn': { edgeCacheHitRate: 0.6, edgeTtlSeconds: 300 }
    };

    const newNode: Node<NodeData> = {
      id,
      type: 'systemNode',
      position,
      data: {
        label: titles[type],
        type,
        status: 'healthy',
        metrics: defaultMetrics(),
        config: defaultConfigs[type] || {}
      }
    };
    set({ nodes: [...get().nodes, newNode], selectedNodeId: id });

    // Live mode: spawn a real worker process for the new component
    if (get().mode === 'live') {
      liveClient.spawnNode(id, type, defaultConfigs[type] || {}).catch((err) => {
        console.error('[SysFlow Live] spawn failed', err);
      });
      liveClient.setTopology(
        get().nodes.map((n) => ({ id: n.id, type: n.data.type })),
        get().edges.map((e) => ({ source: e.source, target: e.target }))
      ).catch(() => {});
    }
  },

  updateNodeConfig: (id, config) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } } : n
      )
    });
  },

  killNode: async (id) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, status: 'dead', metrics: { ...n.data.metrics, cpuUsage: 0, activeConnections: 0, errorRate: 1.0 } } }
          : n
      )
    });
    if (get().mode === 'live') {
      await liveClient.killNode(id).catch((err) => console.error('[SysFlow Live] kill failed', err));
    }
  },

  reviveNode: async (id) => {
    const node = get().nodes.find((n) => n.id === id);
    if (get().mode === 'live' && node) {
      await liveClient.spawnNode(id, node.data.type, node.data.config || {}).catch((err) => {
        console.error('[SysFlow Live] revive failed', err);
      });
      set({
        nodes: get().nodes.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, status: 'healthy', metrics: defaultMetrics() } }
            : n
        )
      });
      return;
    }
    set({
      nodes: get().nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, status: 'healthy', metrics: defaultMetrics() } }
          : n
      )
    });
  },

  deleteSelectedNode: async () => {
    const { selectedNodeId, nodes, edges } = get();
    if (!selectedNodeId) return;
    if (get().mode === 'live') {
      await liveClient.killNode(selectedNodeId).catch((err) => console.error('[SysFlow Live] kill failed', err));
    }
    set({
      nodes: nodes.filter((n) => n.id !== selectedNodeId),
      edges: edges.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId),
      selectedNodeId: null
    });
  },

  deleteEdge: (id) => set({ edges: get().edges.filter((e) => e.id !== id), selectedEdgeId: null }),

  setIsPlaying: async (playing) => {
    set({ isPlaying: playing });
    if (playing) {
      engine.clock.resume();
      if (get().mode === 'live') {
        liveClient.connect();
        // Sync topology to backend and spawn all nodes as real processes
        const { nodes, edges } = get();
        await liveClient.setTopology(
          nodes.map((n) => ({ id: n.id, type: n.data.type })),
          edges.map((e) => ({ source: e.source, target: e.target }))
        ).catch(() => {});
        const existing = await liveClient.getNodes().catch(() => [] as any[]);
        for (const n of nodes) {
          if (!existing.find((x) => x.id === n.id)) {
            liveClient.spawnNode(n.id, n.data.type, n.data.config || {}).catch(() => {});
          }
        }
      }
    } else {
      engine.clock.pause();
      engine.setContinuous(0);
      engine.remainingBatch = 0;
    }
  },

  setSimulationSpeed: (speed) => {
    set({ simulationSpeed: speed });
    engine.clock.setSpeed(speed);
  },

  setMode: (mode) => set({ mode }),

  setTrafficMode: (mode) => set({ trafficMode: mode }),
  setBatchCount: (count) => set({ batchCount: Math.max(1, count) }),
  setContinuousRps: (rps) => set({ continuousRps: Math.max(1, rps) }),
  setChaos: (latencyMs, dropRate) => {
    set({ chaosLatency: latencyMs, chaosDrop: dropRate });
    engine.setChaos(latencyMs, dropRate);
  },

  getTraces: () => engine.getTraceSpans(),

  // ── Single probe ──────────────────────────────────────────────────────
  triggerSingleRequest: () => {
    const { nodes, edges } = get();
    const clientNode = nodes.find((n) => n.data.type === 'client');
    if (!clientNode) {
      console.warn('[SysFlow] No client node on canvas — add a Users/Clients component first!');
      return;
    }

    engine.syncTopology(nodes, edges);
    engine.triggerBatch(1);
    set({ isPlaying: true, trafficMode: 'single' });
    engine.clock.resume();
  },

  // ── Burst / Batch ─────────────────────────────────────────────────────
  triggerBurst: (count) => {
    const batchSize = count ?? get().batchCount;
    engine.setContinuous(0);
    engine.triggerBatch(batchSize);
    set({ isPlaying: true, trafficMode: 'batch' });
    engine.clock.resume();
  },

  // ── Continuous traffic ─────────────────────────────────────────────────
  startContinuous: () => {
    const { continuousRps } = get();
    engine.remainingBatch = 0;
    engine.setContinuous(continuousRps);
    set({ isPlaying: true, trafficMode: 'continuous' });
    engine.clock.resume();
  },

  stopTraffic: () => {
    engine.setContinuous(0);
    engine.remainingBatch = 0;
    set({ isPlaying: false });
    engine.clock.pause();
  },

  // ── Simulation step (called every rAF from ParticleOverlay) ───────────
  stepSimulation: () => {
    const { nodes, edges, simulationSpeed, isPlaying } = get();
    if (!isPlaying) return;

    const result = engine.tick(nodes, edges);

    // Sync every in-flight packet with its current progress from the engine.
    // (Previously still-traveling particles kept stale progress and froze.)
    const inFlight = engine.getInFlightPackets();
    const nextParticles = inFlight.map(toParticle);

    // Update node metrics
    const updatedNodes = nodes.map((node) => {
      const update = result.nodeUpdates.find((u) => u.id === node.id);
      if (update) {
        const nextMetrics = { ...node.data.metrics, ...update.metrics };
        let nextStatus = node.data.status;
        // Apply dynamic status from engine (unless manually killed)
        if (update.status && node.data.status !== 'dead') {
          nextStatus = update.status;
        }
        return { ...node, data: { ...node.data, metrics: nextMetrics, status: nextStatus } };
      }
      return node;
    });

    // Accumulate logs (keep last MAX_LOG_LINES)
    const prevLogs = get().logs;
    const nextLogs = [...prevLogs, ...result.newLogs].slice(-MAX_LOG_LINES);

    // Distributed tracing spans (keep bounded)
    const nextTraces = [...get().traceSpans, ...engine.getTraceSpans()].slice(-1000);

    // Auto-pause when batch finishes
    if (result.shouldAutoPause) {
      engine.clock.pause();
      set({
        isPlaying: false,
        particles: nextParticles,
        nodes: updatedNodes,
        globalMetrics: result.globalMetrics,
        cacheEntries: result.cacheEntries || [],
        logs: nextLogs,
        traceSpans: nextTraces
      });
      return;
    }

    set({
      particles: nextParticles,
      nodes: updatedNodes,
      globalMetrics: result.globalMetrics,
      cacheEntries: result.cacheEntries || [],
      logs: nextLogs,
      traceSpans: nextTraces
    });
  },

  flushCache: (redisNodeId) => {
    if (redisNodeId) {
      engine.redisModels.get(redisNodeId)?.clear();
    } else {
      engine.redisModels.forEach((m) => m.clear());
    }
    set({ cacheEntries: [] });
  },

  addCacheKey: (key, value, ttl) => {
    const firstRedis = Array.from(engine.redisModels.values())[0];
    if (firstRedis) {
      firstRedis.set(key, value, ttl, engine.clock.getTime());
      set({ cacheEntries: firstRedis.getEntries() });
    }
  },

  resetSimulation: () => {
    engine.reset();
    set({
      particles: [],
      nodes: initialNodes,
      edges: initialEdges,
      selectedNodeId: null,
      selectedEdgeId: null,
      cacheEntries: [],
      logs: [],
      traceSpans: [],
      isPlaying: false,
      trafficMode: 'single',
      globalMetrics: { totalRequests: 0, totalResponses: 0, totalResponseErrors: 0, currentRps: 0, errorRate: 0, p50LatencyMs: 0, p99LatencyMs: 0, activeConnections: 0 }
    });
  },

  toggleLogPanel: () => set({ logPanelOpen: !get().logPanelOpen }),
  clearLogs: () => set({ logs: [] })
}));

// Stream live backend logs into the store (callback only; connection starts in setIsPlaying)
liveClient.onLog((log) => {
  const state = useCanvasStore.getState();
  const entry: SimulationLog = {
    id: `live-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    wallTime: Date.now(),
    simTime: Date.now(),
    nodeId: log.nodeId,
    nodeLabel: log.nodeId,
    nodeType: 'live',
    level: 'info',
    message: log.text.trim().replace(/\n$/, ''),
    requestId: undefined
  };
  const nextLogs = [...state.logs, entry].slice(-500);
  useCanvasStore.setState({ logs: nextLogs });
});

