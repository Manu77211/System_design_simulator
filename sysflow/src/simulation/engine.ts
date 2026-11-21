/**
 * SysFlow Simulation Engine — Phase 2
 *
 * TRUE HOP-BY-HOP GRAPH WALKER
 * ─────────────────────────────
 * Packets travel ONE edge at a time. When a packet arrives at a node,
 * the node's state machine decides what to do next and spawns the NEXT
 * packet. No pre-calculation. No fake future timestamps.
 *
 * Request packet path encoding:  "METHOD::urlPath::cacheKey"
 * e.g.  "GET::/api/users/1::user:1"
 */

import { ClockManager } from './clock';
import { PriorityEventQueue } from './eventQueue';
import { RedisModel } from './models/redisModel';
import { DatabaseModel } from './models/databaseModel';
import { ServerModel } from './models/serverModel';
import { LoadBalancerModel, ServerTarget } from './models/loadBalancerModel';
import { InFlightPacket, SimulationLog } from './types';
import { NodeData } from '../types';
import { type Node, type Edge } from '@xyflow/react';

export interface SimulationTickResult {
  newPackets: InFlightPacket[];
  arrivedPacketIds: string[];
  nodeUpdates: Array<{ id: string; metrics: Partial<NodeData['metrics']>; status?: NodeData['status'] }>;
  globalMetrics: {
    totalRequests: number;
    totalResponses: number;
    totalResponseErrors: number;
    currentRps: number;
    errorRate: number;
    p50LatencyMs: number;
    p99LatencyMs: number;
    activeConnections: number;
  };
  cacheEntries?: any[];
  newLogs: SimulationLog[];
  shouldAutoPause?: boolean;
}

type AdjMap = Map<string, Edge[]>;

export class SimulationEngine {
  public clock: ClockManager;
  public eventQueue: PriorityEventQueue;

  public redisModels: Map<string, RedisModel> = new Map();
  public dbModels: Map<string, DatabaseModel> = new Map();
  public serverModels: Map<string, ServerModel> = new Map();
  public lbModels: Map<string, LoadBalancerModel> = new Map();

  private inFlight: Map<string, InFlightPacket> = new Map();
  private logBuffer: SimulationLog[] = [];
  private logSeq: number = 0;

  private latencySamples: number[] = [];
  public totalRequests: number = 0;
  public totalResponses: number = 0;
  private totalResponseErrors: number = 0;
  private requestsInWindow: number = 0;
  private lastRpsWindowStart: number = 0;
  private currentRps: number = 0;

  public remainingBatch: number = 0;
  public continuousRps: number = 0;
  private lastSpawnTime: number = 0;

  // Thundering herd protection: serverId + ":" + key -> list of waiting requestIds
  private pendingDbFetches: Map<string, string[]> = new Map();

  // Downstream timeout tracking: reqId -> { sentAt, serverNodeId, timeoutMs, key }
  private downstreamPending: Map<string, { sentAt: number; serverNodeId: string; timeoutMs: number; key: string }> = new Map();

  // LB sticky sessions: lbId -> hash -> serverId
  private lbStickySessions: Map<string, Map<string, string>> = new Map();

  // Incoming edge per (node, request) so responses retrace the path upstream
  private incomingEdge: Map<string, string> = new Map();

  // Chaos Monkey: artificial latency (ms) injected per hop and packet drop rate (0-1)
  public chaosLatencyMs: number = 0;
  public chaosDropRate: number = 0;

  // Distributed tracing: recorded spans per request for the waterfall view
  public traceSpans: Array<{
    traceId: string;
    spanId: string;
    nodeId: string;
    nodeLabel: string;
    action: string;
    startTime: number;
    durationMs: number;
    status: 'success' | 'slow' | 'error';
  }> = [];

  constructor() {
    this.clock = new ClockManager();
    this.eventQueue = new PriorityEventQueue();
  }

  // ── Public API ──────────────────────────────────────────────────────────

  public triggerBatch(count: number): void {
    this.remainingBatch += count;
    this.continuousRps = 0;
  }

  public setContinuous(rps: number): void {
    this.continuousRps = Math.max(0, rps);
    this.remainingBatch = 0;
  }

  public setChaos(latencyMs: number, dropRate: number): void {
    this.chaosLatencyMs = Math.max(0, latencyMs);
    this.chaosDropRate = Math.min(1, Math.max(0, dropRate));
  }

  public drainLogs(): SimulationLog[] {
    const out = [...this.logBuffer];
    this.logBuffer = [];
    return out;
  }

  /** Return all in-flight packets with current progress (for visual overlay sync) */
  public getInFlightPackets(): InFlightPacket[] {
    return Array.from(this.inFlight.values());
  }

  /** Return all recorded trace spans for the distributed tracing waterfall */
  public getTraceSpans(): Array<{
    traceId: string;
    spanId: string;
    nodeId: string;
    nodeLabel: string;
    action: string;
    startTime: number;
    durationMs: number;
    status: 'success' | 'slow' | 'error';
  }> {
    return [...this.traceSpans];
  }

  // ── Topology sync ────────────────────────────────────────────────────────

  public syncTopology(nodes: Node<NodeData>[], edges: Edge[]): void {
    for (const node of nodes) {
      const cfg = node.data.config || {};
      const t = node.data.type;
      if (t === 'redis-cache' && !this.redisModels.has(node.id)) {
        this.redisModels.set(node.id, new RedisModel(node.id, cfg));
      } else if (t === 'sql-database' && !this.dbModels.has(node.id)) {
        this.dbModels.set(node.id, new DatabaseModel(node.id, cfg));
      } else if (t === 'app-server' && !this.serverModels.has(node.id)) {
        this.serverModels.set(node.id, new ServerModel(node.id, cfg.maxWorkers));
      } else if (t === 'load-balancer' && !this.lbModels.has(node.id)) {
        this.lbModels.set(node.id, new LoadBalancerModel(node.id, cfg.algorithm));
      }
    }
    const ids = new Set(nodes.map((n) => n.id));
    for (const id of this.redisModels.keys()) if (!ids.has(id)) this.redisModels.delete(id);
    for (const id of this.dbModels.keys()) if (!ids.has(id)) this.dbModels.delete(id);
    for (const id of this.serverModels.keys()) if (!ids.has(id)) this.serverModels.delete(id);
    for (const id of this.lbModels.keys()) if (!ids.has(id)) this.lbModels.delete(id);
  }

  // ── Main tick ────────────────────────────────────────────────────────────

  public tick(nodes: Node<NodeData>[], edges: Edge[]): SimulationTickResult {
    this.syncTopology(nodes, edges);
    this.clock.tick();
    const now = this.clock.getTime();

    const adj = this.buildAdj(edges);
    const dead = new Set(nodes.filter((n) => n.data.status === 'dead').map((n) => n.id));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // ── 0. Downstream timeout enforcement (504 Gateway Timeout) ─────────
    for (const [reqId, entry] of this.downstreamPending) {
      if (now - entry.sentAt > entry.timeoutMs) {
        this.downstreamPending.delete(reqId);
        const serverNode = nodeMap.get(entry.serverNodeId);
        if (serverNode) {
          const srv = this.serverModels.get(entry.serverNodeId);
          if (srv) srv.activeWorkers = Math.max(0, srv.activeWorkers - 1);
          this.totalResponseErrors++;
          this.log('error', serverNode,
            `504 Gateway Timeout — upstream did not respond within ${entry.timeoutMs}ms for key="${entry.key}"`, reqId);
        }
      }
    }

    const newPackets: InFlightPacket[] = [];
    const arrivedIds: string[] = [];

    // ── 1. Advance in-flight packets ────────────────────────────────────
    for (const [pid, pkt] of this.inFlight) {
      // Chaos Monkey: randomly drop packets (network failure)
      if (this.chaosDropRate > 0 && Math.random() < this.chaosDropRate) {
        this.inFlight.delete(pid);
        this.totalResponseErrors++;
        const arrivedNode = nodeMap.get(pkt.targetNodeId);
        if (arrivedNode) {
          this.log('error', arrivedNode, `CHAOS: packet dropped (network failure) [${pkt.requestId.slice(-6)}]`, pkt.requestId);
        }
        continue;
      }

      // Chaos Monkey: inject latency by slowing packet progress (applied once)
      let speed = pkt.speed;
      if (this.chaosLatencyMs > 0 && !pkt.chaosDelayed) {
        speed = pkt.speed * 0.25; // 4x slower
        pkt.chaosDelayed = true;
      }
      pkt.speed = speed;

      pkt.progress = Math.min(1, pkt.progress + speed);

      if (pkt.progress >= 1) {
        arrivedIds.push(pid);
        this.inFlight.delete(pid);

        // Which node does this packet arrive at?
        const arrivedAt = pkt.direction === 'forward' ? pkt.targetNodeId : pkt.sourceNodeId;
        const arrivedNode = nodeMap.get(arrivedAt);
        if (!arrivedNode || dead.has(arrivedAt)) continue;

        const spawned = this.deliver(pkt, arrivedNode, nodeMap, adj, dead, now, edges);
        for (const sp of spawned) {
          this.inFlight.set(sp.id, sp);
          newPackets.push(sp);
        }
      }
    }

    // ── 2. Spawn new requests ────────────────────────────────────────────
    let shouldAutoPause = false;
    const clientNode = nodes.find((n) => n.data.type === 'client' && !dead.has(n.id));

    if (clientNode) {
      const needsSpawn =
        (this.remainingBatch > 0) ||
        (this.continuousRps > 0);

      if (needsSpawn) {
        const rateForInterval = this.continuousRps > 0 ? this.continuousRps : Math.min(this.remainingBatch, 20);
        const interval = Math.max(16, Math.round(1000 / rateForInterval));

        if (now - this.lastSpawnTime >= interval) {
          this.lastSpawnTime = now;
          if (this.remainingBatch > 0) this.remainingBatch--;

          const initPkts = this.spawnFromClient(clientNode, adj, dead, now);
          for (const p of initPkts) {
            this.inFlight.set(p.id, p);
            newPackets.push(p);
          }
        }
      }
    }

    if (this.remainingBatch === 0 && this.continuousRps === 0 && this.inFlight.size === 0 && newPackets.length === 0) {
      shouldAutoPause = true;
    }

    // ── 3. Rolling RPS ───────────────────────────────────────────────────
    if (now - this.lastRpsWindowStart >= 500) {
      const sec = (now - this.lastRpsWindowStart) / 1000;
      this.currentRps = Math.round(this.requestsInWindow / Math.max(0.1, sec));
      this.requestsInWindow = 0;
      this.lastRpsWindowStart = now;
    }

    // ── 4. Decay ─────────────────────────────────────────────────────────
    this.serverModels.forEach((s) => s.decayTick());
    this.dbModels.forEach((d) => d.decayTick());

    // ── 5. Node updates ──────────────────────────────────────────────────
    const nodeUpdates: SimulationTickResult['nodeUpdates'] = [];
    for (const node of nodes) {
      const cfg = node.data?.config || {};
      const statusFromMetrics = (cpu: number, errRate: number): 'healthy' | 'degraded' | 'overloaded' => {
        if (cpu > 85 || errRate > 0.10) return 'overloaded';
        if (cpu > 60 || errRate > 0.05) return 'degraded';
        return 'healthy';
      };
      if (node.data.type === 'redis-cache') {
        const r = this.redisModels.get(node.id);
        if (r) {
          const totalOps = r.hits + r.misses;
          const memRatio = r.getCurrentMemoryBytes() / Math.max(1, (cfg.maxMemoryMb || 256) * 1024 * 1024);
          const cpu = Math.min(100, Math.round(5 + (totalOps / 10) * 40 + memRatio * 40));
          nodeUpdates.push({ id: node.id, status: statusFromMetrics(cpu, 0), metrics: {
            cpuUsage: cpu,
            throughputRps: totalOps,
            memoryUsage: parseFloat((r.getCurrentMemoryBytes() / 1024 / 1024).toFixed(2)),
            avgLatencyMs: 0.8, errorRate: 0
          }});
        }
      } else if (node.data.type === 'sql-database') {
        const db = this.dbModels.get(node.id);
        if (db) {
          const connRatio = db.activeConnections / Math.max(1, db.config.maxConnections);
          const cpu = Math.min(100, Math.round(5 + (connRatio * 60) + (db.queryQueueLength / Math.max(1, db.config.maxQueueDepth)) * 35));
          const errRate = db.totalQueries > 0 ? db.rejectedQueries / db.totalQueries : 0;
          nodeUpdates.push({ id: node.id, status: statusFromMetrics(cpu, errRate), metrics: {
            cpuUsage: cpu,
            activeConnections: db.activeConnections,
            queueDepth: db.queryQueueLength,
            memoryUsage: parseFloat(((db.activeConnections / Math.max(1, db.config.maxConnections)) * 100).toFixed(2)),
            errorRate: errRate,
            avgLatencyMs: Math.round(db.config.baseQueryLatencyMs * (1 + (cpu / 100) * 2))
          }});
        }
      } else if (node.data.type === 'app-server') {
        const s = this.serverModels.get(node.id);
        if (s) {
          const workerRatio = s.activeWorkers / Math.max(1, s.maxWorkers);
          const memCeil = cfg.memoryCeilingMb || 1024;
          const memRatio = Math.min(1, s.memoryUsageMb / memCeil);
          const cpu = Math.min(100, Math.round(5 + (workerRatio * 70) + (memRatio * 25)));
          const errRate = s.totalProcessed > 0 ? s.totalErrors / s.totalProcessed : 0;
          nodeUpdates.push({ id: node.id, status: statusFromMetrics(cpu, errRate), metrics: {
            cpuUsage: cpu,
            activeConnections: s.activeWorkers,
            memoryUsage: s.memoryUsageMb,
            errorRate: errRate
          }});
        }
      } else if (node.data.type === 'load-balancer') {
        const cpu = Math.min(100, Math.round(5 + (this.inFlight.size / 10) * 60 + (this.currentRps / 1000) * 20));
        nodeUpdates.push({ id: node.id, status: statusFromMetrics(cpu, 0), metrics: {
          cpuUsage: cpu,
          throughputRps: this.currentRps,
          activeConnections: this.inFlight.size
        }});
      }
    }

    if (this.latencySamples.length > 1000) this.latencySamples = this.latencySamples.slice(-500);
    const sorted = [...this.latencySamples].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? 0;

    const primaryRedis = Array.from(this.redisModels.values())[0];

    return {
      newPackets,
      arrivedPacketIds: arrivedIds,
      nodeUpdates,
      globalMetrics: {
        totalRequests: this.totalRequests,
        totalResponses: this.totalResponses,
        totalResponseErrors: this.totalResponseErrors,
        currentRps: this.currentRps,
        errorRate: this.totalRequests > 0 ? this.totalResponseErrors / Math.max(1, this.totalRequests) : 0,
        p50LatencyMs: Math.round(p50 * 10) / 10,
        p99LatencyMs: Math.round(p99 * 10) / 10,
        activeConnections: this.inFlight.size
      },
      cacheEntries: primaryRedis ? primaryRedis.getEntries() : [],
      newLogs: this.drainLogs(),
      shouldAutoPause
    };
  }

  // ── Spawn from client ────────────────────────────────────────────────────

  private spawnFromClient(
    client: Node<NodeData>,
    adj: AdjMap,
    dead: Set<string>,
    now: number
  ): InFlightPacket[] {
    this.totalRequests++;
    this.requestsInWindow++;

    const cfg = client.data?.config || {};
    const reqId = `req-${now.toString(36)}-${(Math.random() * 0xffff | 0).toString(16)}`;
    const method = (cfg.requestType || 'GET') as string;
    const pattern = (cfg.pattern || 'constant') as string;

    // Traffic pattern shapes the request key / path distribution
    let keyId: number;
    let path: string;
    let key: string;
    switch (pattern) {
      case 'ramp': {
        // Gradually hit higher-numbered keys over time
        keyId = ((this.totalRequests % 50) + 1);
        path = `/api/data/${keyId}`;
        key = `item:${keyId}`;
        break;
      }
      case 'spike': {
        // Burst hits a small hot-key set repeatedly
        keyId = ((this.totalRequests % 5) + 1);
        path = `/api/data/${keyId}`;
        key = `item:${keyId}`;
        break;
      }
      case 'diurnal': {
        // Sine-wave-driven key selection (simulates day/night load)
        const wave = Math.floor(25 + 25 * Math.sin(now / 5000));
        keyId = (wave % 50) + 1;
        path = `/api/data/${keyId}`;
        key = `item:${keyId}`;
        break;
      }
      case 'constant':
      default: {
        keyId = (this.totalRequests % 5) + 1;
        path = `/api/data/${keyId}`;
        key = `item:${keyId}`;
        break;
      }
    }

    this.log('info', client, `→ ${method} ${path}  [${reqId.slice(-6)}]  pattern=${pattern}`, reqId);

    const traceId = `trc-${now.toString(36)}-${(Math.random() * 0xffff | 0).toString(16)}`;
    const outEdges = (adj.get(client.id) || []).filter((e) => !dead.has(e.target));
    if (outEdges.length === 0) {
      this.log('warn', client, 'No outgoing connections — drag a wire to another component first!', reqId);
      return [];
    }

    return outEdges.map((e) => this.mkPkt(reqId, e, 'forward', '#38bdf8', method, path, key, traceId));
  }

  // ── Delivery handler ─────────────────────────────────────────────────────

  private deliver(
    pkt: InFlightPacket,
    node: Node<NodeData>,
    nodeMap: Map<string, Node<NodeData>>,
    adj: AdjMap,
    dead: Set<string>,
    now: number,
    edges: Edge[]
  ): InFlightPacket[] {
    const type = node.data.type;
    const reqId = pkt.requestId;
    const [method, urlPath, key] = pkt.path.split('::');
    const outEdges = (adj.get(node.id) || []).filter((e) => !dead.has(e.target));

    // Remember which edge this request arrived on so responses retrace upstream
    if (pkt.direction === 'forward') {
      this.incomingEdge.set(`${node.id}:${reqId}`, pkt.edgeId);
    }

    // ── Distributed tracing: record a span for every hop ────────────────
    const traceId = pkt.traceId || reqId;
    const nodeLabel = node.data.label || node.id;
    const action = pkt.direction === 'forward' ? `${method} ${urlPath}` : `← ${method} ${urlPath}`;
    const baseDuration = type === 'redis-cache' ? 1 : type === 'sql-database' ? 25 : 5;
    this.traceSpans.push({
      traceId,
      spanId: `${reqId.slice(-6)}-${node.id}-${pkt.direction[0]}`,
      nodeId: node.id,
      nodeLabel,
      action,
      startTime: now,
      durationMs: baseDuration + Math.floor(Math.random() * 10),
      status: pkt.status
    });

    // Keep trace buffer bounded
    if (this.traceSpans.length > 2000) this.traceSpans = this.traceSpans.slice(-1000);

    if (pkt.direction === 'forward') {
      return this.forwardAt(pkt, node, type, outEdges, nodeMap, adj, dead, now, edges, reqId, method, urlPath, key);
    } else {
      return this.returnAt(pkt, node, type, adj, dead, now, edges, reqId, method, urlPath, key);
    }
  }

  // ── Forward arrival at node ──────────────────────────────────────────────

  private forwardAt(
    pkt: InFlightPacket,
    node: Node<NodeData>,
    type: string,
    outEdges: Edge[],
    nodeMap: Map<string, Node<NodeData>>,
    adj: AdjMap,
    dead: Set<string>,
    now: number,
    _edges: Edge[],
    reqId: string, method: string, urlPath: string, key: string
  ): InFlightPacket[] {

    switch (type) {

      // ─ Load Balancer ───────────────────────────────────────────────────
      case 'load-balancer': {
        const lb = this.lbModels.get(node.id) || new LoadBalancerModel(node.id);
        const cfg = node.data?.config || {};
        const targets: ServerTarget[] = outEdges.map((e) => {
          const srv = this.serverModels.get(e.target);
          return {
            id: e.target,
            healthy: !dead.has(e.target),
            activeConnections: srv ? srv.activeWorkers : 0,
            weight: 1,
            responseTimeAvg: 5
          };
        });
        const chosen = lb.selectServer(targets);
        if (!chosen) {
          this.log('error', node, `All servers DOWN — 503 Service Unavailable`, reqId);
          this.totalResponseErrors++;
          this.totalResponseErrors++;
          return [this.ret(pkt, '#ef4444', 'error', method, urlPath, key)];
        }

        // Max connections per server → fast-fail 503
        const maxConn = cfg.maxConnections || 1000;
        const chosenSrv = this.serverModels.get(chosen.id);
        if (chosenSrv && chosenSrv.activeWorkers >= maxConn) {
          this.log('warn', node, `Server ${chosen.id} at connection ceiling (${chosenSrv.activeWorkers}/${maxConn}) — 503`, reqId);
          this.totalResponseErrors++;
          this.totalResponseErrors++;
          return [this.ret(pkt, '#ef4444', 'error', method, urlPath, key)];
        }

        // Sticky sessions: route same client hash to same server
        let finalServer = chosen.id;
        if (cfg.stickySession) {
          if (!this.lbStickySessions.has(node.id)) this.lbStickySessions.set(node.id, new Map());
          const stickyMap = this.lbStickySessions.get(node.id)!;
          const clientHash = reqId; // proxy for client identity
          const existing = stickyMap.get(clientHash);
          if (existing && this.serverModels.has(existing) && !dead.has(existing)) {
            finalServer = existing;
          } else {
            stickyMap.set(clientHash, finalServer);
          }
        }
        const chosenEdge = outEdges.find((e) => e.target === finalServer)!;
        const dest = nodeMap.get(finalServer);
        this.log('info', node, `${node.data.config?.algorithm || 'round-robin'} → ${dest?.data.label || finalServer}`, reqId);
        return [this.mkPkt(reqId, chosenEdge, 'forward', '#38bdf8', method, urlPath, key)];
      }

      // ─ App Server ──────────────────────────────────────────────────────
      case 'app-server': {
        const srv = this.serverModels.get(node.id) || new ServerModel(node.id);
        const cfg = node.data?.config || {};

        // Memory ceiling / OOM check
        const projectedMem = 120 + (srv.activeWorkers + 1) * 10;
        if (cfg.memoryCeilingMb && projectedMem > cfg.memoryCeilingMb) {
          this.log('error', node, `OOM — memory ceiling ${cfg.memoryCeilingMb}MB exceeded, killing worker`, reqId);
          this.totalResponseErrors++;
          this.totalResponseErrors++;
          return [this.ret(pkt, '#ef4444', 'error', method, urlPath, key)];
        }

        srv.activeWorkers++;
        srv.cpuUsage = Math.min(100, 20 + Math.round((srv.activeWorkers / srv.maxWorkers) * 70));
        srv.memoryUsageMb = 120 + srv.activeWorkers * 10;
        srv.totalProcessed++;
        this.log('info', node, `${method} ${urlPath}  workers: ${srv.activeWorkers}/${srv.maxWorkers}  CPU: ${srv.cpuUsage}%`, reqId);

        const cacheEdge = outEdges.find((e) => this.redisModels.has(e.target));
        const dbEdge = outEdges.find((e) => this.dbModels.has(e.target));
        const downstreamTimeoutMs = cfg.downstreamTimeoutMs || 5000;

        const herdKey = `${node.id}:${key}`;

        if (method === 'GET') {
          if (cacheEdge) {
            this.log('info', node, `Checking cache for key="${key}"`, reqId);

            // Thundering herd: if a DB fetch for this key is already in flight, join the waiters
            const waiters = this.pendingDbFetches.get(herdKey);
            if (waiters && cfg.thunderingHerd !== false) {
              waiters.push(reqId);
              this.log('warn', node, `Thundering herd — joining shared DB fetch for key="${key}" (${waiters.length} waiting)`, reqId);
              // Hold this request at the server; do not forward to DB yet
              srv.activeWorkers = Math.max(0, srv.activeWorkers - 1);
              return [];
            }

            return [this.mkPkt(reqId, cacheEdge, 'forward', '#38bdf8', method, urlPath, key)];
          } else if (dbEdge) {
            this.log('info', node, `No cache attached — going directly to DB`, reqId);
            this.trackDownstream(pkt, node.id, downstreamTimeoutMs, reqId, key);
            return [this.mkPkt(reqId, dbEdge, 'forward', '#f59e0b', method, urlPath, key)];
          } else {
            srv.activeWorkers = Math.max(0, srv.activeWorkers - 1);
            this.log('success', node, `200 OK (no backend attached)`, reqId);
            return [this.ret(pkt, '#38bdf8', 'success', method, urlPath, key)];
          }
        } else {
          // Write request — invalidate cache first
          if (cfg.writeInvalidation !== false && cacheEdge) {
            this.log('info', node, `${method} — invalidating cache key="${key}" before write`, reqId);
            const redis = this.redisModels.get(cacheEdge.target);
            if (redis) {
              redis.delete(key);
              this.log('info', node, `Cache invalidated key="${key}"`, reqId);
            }
          }

          if (dbEdge) {
            this.log('info', node, `${method} — writing to DB, key="${key}"`, reqId);
            this.trackDownstream(pkt, node.id, downstreamTimeoutMs, reqId, key);
            return [this.mkPkt(reqId, dbEdge, 'forward', '#f97316', method, urlPath, key)];
          } else {
            srv.activeWorkers = Math.max(0, srv.activeWorkers - 1);
            this.log('success', node, `${method === 'POST' ? '201 Created' : '200 OK'} (no DB attached)`, reqId);
            return [this.ret(pkt, '#38bdf8', 'success', method, urlPath, key)];
          }
        }
      }

      // ─ Redis Cache ─────────────────────────────────────────────────────
      case 'redis-cache': {
        const redis = this.redisModels.get(node.id) || new RedisModel(node.id);
        const result = redis.get(key, now);
        const entryCount = redis.getEntries().length;

        if (result.hit) {
          this.log('success', node,
            `CACHE HIT  key="${key}"  ${entryCount} keys  latency: ${result.latencyMs.toFixed(1)}ms`, reqId);
          return [this.ret(pkt, '#22c55e', 'success', method, urlPath, key)];
        } else {
          this.log('warn', node,
            `CACHE MISS key="${key}"  ${entryCount} keys  — forwarding to DB`, reqId);
          // Forward to any DB connected to this Redis node
          const dbEdge = outEdges.find((e) => this.dbModels.has(e.target));
          if (dbEdge) {
            return [this.mkPkt(reqId, dbEdge, 'forward', '#eab308', method, urlPath, key)];
          }
          // No DB on redis? Return miss
          this.log('error', node, `No DB connected to Redis — returning empty response`, reqId);
          return [this.ret(pkt, '#eab308', 'slow', method, urlPath, key)];
        }
      }

      // ─ SQL Database ────────────────────────────────────────────────────
      case 'sql-database': {
        const db = this.dbModels.get(node.id) || new DatabaseModel(node.id);
        const isWrite = method === 'POST' || method === 'PUT' || method === 'DELETE';
        const result = db.executeQuery(isWrite);
        const latency = result.latencyMs + result.queueDelayMs;

        if (!result.success) {
          this.log('error', node,
            `DB ${isWrite ? 'WRITE' : 'READ'} REJECTED — ${result.errorReason}  pool: ${db.activeConnections}/${db.config.maxConnections}`, reqId);
          this.totalResponseErrors++;
          db.releaseConnection();
          return [this.ret(pkt, '#ef4444', 'error', method, urlPath, key)];
        }

        this.log('info', node,
          `DB ${isWrite ? 'WRITE' : 'READ'} OK  key="${key}"  latency: ${latency.toFixed(0)}ms  connections: ${db.activeConnections}/${db.config.maxConnections}`, reqId);
        this.latencySamples.push(latency);
        db.releaseConnection();
        return [this.ret(pkt, '#f59e0b', 'success', method, urlPath, key)];
      }

      // ─ API Gateway ─────────────────────────────────────────────────────
      case 'api-gateway': {
        this.log('info', node, `Routing ${method} ${urlPath}`, reqId);
        if (outEdges.length === 0) return [this.ret(pkt, '#a78bfa', 'success', method, urlPath, key)];
        return outEdges.map((e) => this.mkPkt(reqId, e, 'forward', '#a78bfa', method, urlPath, key));
      }

      // ─ CDN ─────────────────────────────────────────────────────────────
      case 'cdn': {
        const hit = Math.random() < 0.6;
        if (hit) {
          this.log('success', node, `CDN HIT — serving from edge cache (0.5ms)`, reqId);
          return [this.ret(pkt, '#06b6d4', 'success', method, urlPath, key)];
        }
        this.log('warn', node, `CDN MISS — forwarding to origin`, reqId);
        if (outEdges.length === 0) return [this.ret(pkt, '#06b6d4', 'slow', method, urlPath, key)];
        return outEdges.map((e) => this.mkPkt(reqId, e, 'forward', '#06b6d4', method, urlPath, key));
      }

      // ─ Message Queue ───────────────────────────────────────────────────
      case 'message-queue': {
        this.log('info', node, `MQ: message enqueued  key="${key}"`, reqId);
        // Acknowledge enqueue immediately back to sender, then fanout to consumers
        const ack = this.ret(pkt, '#f59e0b', 'success', method, urlPath, key);
        const fanout = outEdges.map((e) => this.mkPkt(reqId, e, 'forward', '#f59e0b', method, urlPath, key));
        return [ack, ...fanout];
      }

      // ─ Client (forward arrival = this shouldn't happen normally) ───────
      case 'client': {
        this.log('success', node, `← Response ${urlPath} [${reqId.slice(-6)}]`, reqId);
        return [];
      }

      default:
        return [];
    }
  }

  // ── Return arrival at node ───────────────────────────────────────────────

  private returnAt(
    pkt: InFlightPacket,
    node: Node<NodeData>,
    type: string,
    _adj: AdjMap,
    _dead: Set<string>,
    now: number,
    edges: Edge[],
    reqId: string, method: string, urlPath: string, key: string
  ): InFlightPacket[] {

    switch (type) {

      // ─ Redis Cache (got DB result, now cache it and return to server) ──
      case 'redis-cache': {
        if (pkt.status === 'success' && method === 'GET') {
          const redis = this.redisModels.get(node.id) || new RedisModel(node.id);
          const cfg = node.data?.config || {};
          const ttl = cfg.ttlSeconds || 60;
          redis.set(key, JSON.stringify({ id: key, cached: true }), ttl, now);
          this.log('info', node,
            `CACHE WRITE key="${key}"  TTL=${ttl}s  total keys: ${redis.getEntries().length}`, reqId);
        }
        // Propagate the same status up
        const color = pkt.color === '#ef4444' ? '#ef4444' : '#22c55e';
        return this.returnViaUpstream(pkt, node, edges, color, pkt.status, method, urlPath, key);
      }

      // ─ App Server (got response from cache/DB, release worker, return to LB) ─
      case 'app-server': {
        const srv = this.serverModels.get(node.id) || new ServerModel(node.id);
        srv.activeWorkers = Math.max(0, srv.activeWorkers - 1);
        srv.cpuUsage = srv.activeWorkers === 0 ? 2 : Math.min(100, Math.max(2, Math.round(20 + (srv.activeWorkers / srv.maxWorkers) * 60)));
        // Clear downstream timeout tracking — response came back
        this.downstreamPending.delete(reqId);

        // Release thundering-herd waiters now that the shared DB result is back
        const herdKey = `${node.id}:${key}`;
        const waiters = this.pendingDbFetches.get(herdKey);
        if (waiters && pkt.status === 'success') {
          this.pendingDbFetches.delete(herdKey);
          this.log('info', node,
            `Single-flight released ${waiters.length} waiting request(s) for key="${key}" from shared result`, reqId);
        }

        const sc = pkt.status === 'success' ? 200 : 503;
        this.log(pkt.status === 'success' ? 'success' : 'error', node,
          `← ${sc}  workers now: ${srv.activeWorkers}/${srv.maxWorkers}  CPU: ${srv.cpuUsage}%`, reqId);

        return this.returnViaUpstream(pkt, node, edges, pkt.color, pkt.status, method, urlPath, key);
      }

      // ─ Load Balancer (forward response to client) ──────────────────────
      case 'load-balancer': {
        this.log('info', node, `← Routing response to client`, reqId);
        return this.returnViaUpstream(pkt, node, edges, pkt.color, pkt.status, method, urlPath, key);
      }

      // ─ API Gateway ─────────────────────────────────────────────────────
      case 'api-gateway': {
        return this.returnViaUpstream(pkt, node, edges, pkt.color, pkt.status, method, urlPath, key);
      }

      // ─ CDN (response from origin, serve to client) ─────────────────────
      case 'cdn': {
        return this.returnViaUpstream(pkt, node, edges, pkt.color, pkt.status, method, urlPath, key);
      }

      // ─ SQL Database (return query result, release connection) ──────────
      case 'sql-database': {
        const db = this.dbModels.get(node.id);
        if (db) {
          db.releaseConnection();
          this.log('info', node,
            `← Query complete  released connection  active: ${db.activeConnections}/${db.config.maxConnections}  CPU: ${db.cpuUsage}%`, reqId);
        }
        return this.returnViaUpstream(pkt, node, edges, pkt.color, pkt.status, method, urlPath, key);
      }

      // ─ Client — final destination ───────────────────────────────────────
      case 'client': {
        const sc = pkt.status === 'success' ? 200 : 503;
        this.totalResponses++;
        if (pkt.status !== 'success') this.totalResponseErrors++;
        this.log(pkt.status === 'success' ? 'success' : 'error', node,
          `✓ ${sc}  ${urlPath}  [${reqId.slice(-6)}]`, reqId);
        this.latencySamples.push(now - 0); // approximate e2e
        return [];
      }

      default:
        return this.returnViaUpstream(pkt, node, edges, pkt.color, pkt.status, method, urlPath, key);
    }
  }

  // ── Packet factories ─────────────────────────────────────────────────────

  /** Create a NEW forward packet on an edge */
  private mkPkt(
    reqId: string,
    edge: Edge,
    direction: 'forward' | 'return',
    color: string,
    method: string,
    urlPath: string,
    key: string,
    traceId?: string
  ): InFlightPacket {
    return {
      id: `pkt-${reqId.slice(-6)}-${edge.id.slice(-8)}-${direction[0]}-${(Math.random() * 0xfff | 0).toString(16)}`,
      requestId: reqId,
      edgeId: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      direction,
      progress: 0,
      speed: 0.016 + Math.random() * 0.008,
      color,
      status: 'success',
      payloadSizeKb: 1.0,
      path: `${method}::${urlPath}::${key}`,
      traceId
    };
  }

  /** Create a RETURN packet on the same edge, flipping direction */
  private ret(
    orig: InFlightPacket,
    color: string,
    status: 'success' | 'slow' | 'error',
    method: string,
    urlPath: string,
    key: string
  ): InFlightPacket {
    const newDir: 'forward' | 'return' = orig.direction === 'forward' ? 'return' : 'forward';
    return {
      id: `pkt-${orig.requestId.slice(-6)}-${orig.edgeId.slice(-8)}-${newDir[0]}-${(Math.random() * 0xfff | 0).toString(16)}`,
      requestId: orig.requestId,
      edgeId: orig.edgeId,
      sourceNodeId: orig.sourceNodeId,
      targetNodeId: orig.targetNodeId,
      direction: newDir,
      progress: 0,
      speed: (0.016 + Math.random() * 0.008) * 1.1,
      color,
      status,
      payloadSizeKb: 1.2,
      path: `${method}::${urlPath}::${key}`,
      traceId: orig.traceId
    };
  }

  /** Record that a downstream fetch is in flight so we can enforce timeouts */
  private trackDownstream(
    pkt: InFlightPacket,
    serverNodeId: string,
    timeoutMs: number,
    reqId: string,
    key: string
  ): void {
    this.downstreamPending.set(reqId, {
      sentAt: this.clock.getTime(),
      serverNodeId,
      timeoutMs,
      key
    });
  }

  /** Build a RETURN packet that travels back along a specific edge (upstream). */
  private returnUpstream(
    orig: InFlightPacket,
    edge: Edge,
    color: string,
    status: 'success' | 'slow' | 'error',
    method: string,
    urlPath: string,
    key: string
  ): InFlightPacket {
    return {
      id: `pkt-${orig.requestId.slice(-6)}-${edge.id.slice(-8)}-r-${(Math.random() * 0xfff | 0).toString(16)}`,
      requestId: orig.requestId,
      edgeId: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      direction: 'return',
      progress: 0,
      speed: (0.016 + Math.random() * 0.008) * 1.1,
      color,
      status,
      payloadSizeKb: 1.2,
      path: `${method}::${urlPath}::${key}`,
      traceId: orig.traceId
    };
  }

  /** Send a response back along the edge the request originally arrived on. */
  private returnViaUpstream(
    pkt: InFlightPacket,
    node: Node<NodeData>,
    edges: Edge[],
    color: string,
    status: 'success' | 'slow' | 'error',
    method: string,
    urlPath: string,
    key: string
  ): InFlightPacket[] {
    const upstreamEdgeId = this.incomingEdge.get(`${node.id}:${pkt.requestId}`);
    const upstreamEdge = upstreamEdgeId ? edges.find((e) => e.id === upstreamEdgeId) : undefined;
    if (upstreamEdge) {
      return [this.returnUpstream(pkt, upstreamEdge, color, status, method, urlPath, key)];
    }
    return [this.ret(pkt, color, status, method, urlPath, key)];
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private buildAdj(edges: Edge[]): AdjMap {
    const m: AdjMap = new Map();
    for (const e of edges) {
      if (!m.has(e.source)) m.set(e.source, []);
      m.get(e.source)!.push(e);
    }
    return m;
  }

  private log(level: SimulationLog['level'], node: Node<NodeData>, msg: string, reqId?: string): void {
    this.logBuffer.push({
      id: `log-${++this.logSeq}`,
      wallTime: Date.now(),
      simTime: this.clock.getTime(),
      nodeId: node.id,
      nodeLabel: node.data.label,
      nodeType: node.data.type,
      level,
      message: msg,
      requestId: reqId
    });
  }

  // ── Legacy compat (used by tests) ────────────────────────────────────────

  /** Legacy single-request dispatch — now just starts a batch of 1 and ticks once */
  public dispatchRequest(
    req: { id: string; traceId: string; clientNodeId: string; method: string; path: string; key: string; createdAt: number; currentHop: string; history: any[]; status: string },
    nodes: Node<NodeData>[],
    edges: Edge[],
    _currentTime: number
  ): { particles: InFlightPacket[]; success: boolean; cacheHit: boolean; latencyMs: number } | null {
    this.syncTopology(nodes, edges);
    const adj = this.buildAdj(edges);
    const dead = new Set(nodes.filter((n) => n.data.status === 'dead').map((n) => n.id));
    const clientNode = nodes.find((n) => n.id === req.clientNodeId);
    if (!clientNode) return null;

    this.totalRequests++;
    this.requestsInWindow++;

    const reqId = req.id;
    const method = req.method;
    const urlPath = req.path;
    const key = req.key;

    const outEdges = (adj.get(clientNode.id) || []).filter((e) => !dead.has(e.target));
    if (outEdges.length === 0) return null;

    // Eagerly walk the whole graph synchronously to produce particles for display
    const particles: InFlightPacket[] = [];
    let cacheHit = false;
    let latencyMs = 1;

    const walk = (pkt: InFlightPacket, depth: number) => {
      if (depth > 12) return;
      particles.push({ ...pkt }); // forward particle

      const targetId = pkt.direction === 'forward' ? pkt.targetNodeId : pkt.sourceNodeId;
      const targetNode = nodes.find((n) => n.id === targetId);
      if (!targetNode || dead.has(targetId)) return;

      const type = targetNode.data.type;
      const cfg = targetNode.data.config || {};
      const tOutEdges = (adj.get(targetNode.id) || []).filter((e) => !dead.has(e.target));

      if (pkt.direction === 'forward') {
        if (type === 'load-balancer') {
          const lb = this.lbModels.get(targetNode.id) || new LoadBalancerModel(targetNode.id, cfg.algorithm);
          const targets: ServerTarget[] = tOutEdges.map((e) => ({
            id: e.target, healthy: !dead.has(e.target), activeConnections: 0, weight: 1, responseTimeAvg: 5
          }));
          const chosen = lb.selectServer(targets);
          if (!chosen) { walk(this.ret(pkt, '#ef4444', 'error', method, urlPath, key), depth + 1); return; }
          const e = tOutEdges.find((x) => x.target === chosen.id);
          if (e) walk(this.mkPkt(reqId, e, 'forward', '#38bdf8', method, urlPath, key), depth + 1);
        } else if (type === 'app-server') {
          const cacheEdge = tOutEdges.find((e) => this.redisModels.has(e.target));
          const dbEdge = tOutEdges.find((e) => this.dbModels.has(e.target));
          if (cacheEdge) walk(this.mkPkt(reqId, cacheEdge, 'forward', '#38bdf8', method, urlPath, key), depth + 1);
          else if (dbEdge) walk(this.mkPkt(reqId, dbEdge, 'forward', '#f59e0b', method, urlPath, key), depth + 1);
          else walk(this.ret(pkt, '#38bdf8', 'success', method, urlPath, key), depth + 1);
        } else if (type === 'redis-cache') {
          const redis = this.redisModels.get(targetNode.id) || new RedisModel(targetNode.id);
          const result = redis.get(key, 0);
          cacheHit = result.hit;
          if (result.hit) {
            walk(this.ret(pkt, '#22c55e', 'success', method, urlPath, key), depth + 1);
          } else {
            const dbEdge = tOutEdges.find((e) => this.dbModels.has(e.target));
            if (dbEdge) walk(this.mkPkt(reqId, dbEdge, 'forward', '#eab308', method, urlPath, key), depth + 1);
            else walk(this.ret(pkt, '#eab308', 'slow', method, urlPath, key), depth + 1);
          }
        } else if (type === 'sql-database') {
          latencyMs += 25;
          walk(this.ret(pkt, '#f59e0b', 'success', method, urlPath, key), depth + 1);
        } else {
          walk(this.ret(pkt, pkt.color, pkt.status, method, urlPath, key), depth + 1);
        }
      } else {
        // Return direction
        if (type === 'redis-cache' && !cacheHit && method === 'GET') {
          const redis = this.redisModels.get(targetNode.id) || new RedisModel(targetNode.id);
          redis.set(key, JSON.stringify({ id: key }), 60, 0);
        }
        if (type !== 'client') {
          walk(this.ret(pkt, pkt.color, pkt.status, method, urlPath, key), depth + 1);
        }
      }
    };

    for (const e of outEdges) {
      walk(this.mkPkt(reqId, e, 'forward', '#38bdf8', method, urlPath, key), 0);
    }

    return { particles, success: true, cacheHit, latencyMs };
  }

  // ── Reset ────────────────────────────────────────────────────────────────

  public reset(): void {
    this.clock.reset();
    this.eventQueue.clear();
    this.inFlight.clear();
    this.logBuffer = [];
    this.logSeq = 0;
    this.redisModels.forEach((m) => m.clear());
    this.dbModels.forEach((m) => m.reset());
    this.serverModels.forEach((m) => m.reset());
    this.lbModels.forEach((m) => m.reset());
    this.latencySamples = [];
    this.totalRequests = 0;
    this.totalResponses = 0;
    this.totalResponseErrors = 0;
    this.currentRps = 0;
    this.requestsInWindow = 0;
    this.remainingBatch = 0;
    this.continuousRps = 0;
    this.chaosLatencyMs = 0;
    this.chaosDropRate = 0;
    this.pendingDbFetches.clear();
    this.downstreamPending.clear();
    this.lbStickySessions.clear();
    this.traceSpans = [];
  }
}
