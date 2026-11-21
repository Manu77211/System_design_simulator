import { describe, it, expect } from 'vitest';
import { RedisModel } from '../simulation/models/redisModel';
import { DatabaseModel } from '../simulation/models/databaseModel';
import { LoadBalancerModel } from '../simulation/models/loadBalancerModel';
import { ServerModel } from '../simulation/models/serverModel';
import { SimulationEngine } from '../simulation/engine';
import { useCanvasStore } from '../store/canvasStore';
import { type Node, type Edge } from '@xyflow/react';
import { NodeData } from '../types';

const baseMetrics = { cpuUsage: 2, memoryUsage: 45, activeConnections: 0, queueDepth: 0, throughputRps: 0, errorRate: 0, avgLatencyMs: 0 };

describe('Phase 2: Discrete Event Simulation Engine & State Machines', () => {
  describe('RedisModel', () => {
    it('starts 100% empty with 0 keys', () => {
      const redis = new RedisModel('cache-1');
      expect(redis.getEntries().length).toBe(0);
      expect(redis.get('user:1', 0).hit).toBe(false);
    });

    it('returns Cache HIT in <1ms after key is populated', () => {
      const redis = new RedisModel('cache-1');
      redis.set('user:10', JSON.stringify({ name: 'Manu' }), 60, 1000);

      const result = redis.get('user:10', 1500); // 500ms later
      expect(result.hit).toBe(true);
      expect(result.latencyMs).toBeLessThanOrEqual(1.0);
      expect(redis.hits).toBe(1);
    });

    it('expires keys automatically when TTL is breached', () => {
      const redis = new RedisModel('cache-1');
      redis.set('session:abc', 'token', 2, 1000); // 2 second TTL

      expect(redis.get('session:abc', 2000).hit).toBe(true);

      const expiredResult = redis.get('session:abc', 3500);
      expect(expiredResult.hit).toBe(false);
    });
  });

  describe('DatabaseModel', () => {
    it('leases connections and calculates degraded latency under load', () => {
      const db = new DatabaseModel('db-1', { maxConnections: 10, baseQueryLatencyMs: 20 });
      const r1 = db.executeQuery(false);

      expect(r1.success).toBe(true);
      expect(db.activeConnections).toBe(1);
      expect(r1.latencyMs).toBeGreaterThanOrEqual(20);

      db.releaseConnection();
      expect(db.activeConnections).toBe(0);
    });

    it('rejects queries with 503 when connection pool and queue are saturated', () => {
      const db = new DatabaseModel('db-1', { maxConnections: 2, maxQueueDepth: 1 });

      db.executeQuery(false);
      db.executeQuery(false);
      db.executeQuery(false);
      const overflow = db.executeQuery(false);

      expect(overflow.success).toBe(false);
      expect(overflow.errorReason).toContain('Connection Pool Exhausted');
      expect(db.rejectedQueries).toBe(1);
    });
  });

  describe('LoadBalancerModel', () => {
    it('round-robins traffic evenly across healthy servers', () => {
      const lb = new LoadBalancerModel('lb-1', 'round-robin');
      const servers = [
        { id: 's1', healthy: true, activeConnections: 0, weight: 1, responseTimeAvg: 5 },
        { id: 's2', healthy: true, activeConnections: 0, weight: 1, responseTimeAvg: 5 }
      ];

      const first = lb.selectServer(servers);
      const second = lb.selectServer(servers);
      const third = lb.selectServer(servers);

      expect(first?.id).toBe('s1');
      expect(second?.id).toBe('s2');
      expect(third?.id).toBe('s1');
    });

    it('immediately bypasses dead servers', () => {
      const lb = new LoadBalancerModel('lb-1', 'round-robin');
      const servers = [
        { id: 's1', healthy: false, activeConnections: 0, weight: 1, responseTimeAvg: 5 },
        { id: 's2', healthy: true, activeConnections: 0, weight: 1, responseTimeAvg: 5 }
      ];

      const s = lb.selectServer(servers);
      expect(s?.id).toBe('s2');
    });
  });

  describe('ServerModel (Cache vs Database Flow)', () => {
    it('returns immediately on Cache HIT without touching database', () => {
      const server = new ServerModel('srv-1');
      const redis = new RedisModel('cache-1');
      const db = new DatabaseModel('db-1');

      redis.set('user:42', JSON.stringify({ name: 'Manu' }), 60, 0);

      const result = server.processRequest(
        {
          id: 'req-1',
          traceId: 'trc-1',
          clientNodeId: 'c1',
          method: 'GET',
          path: '/api/users/42',
          key: 'user:42',
          createdAt: 0,
          currentHop: 'srv-1',
          history: [],
          status: 'in-flight'
        },
        redis,
        db,
        0
      );

      expect(result.success).toBe(true);
      expect(result.cacheHit).toBe(true);
      expect(db.totalQueries).toBe(0);
    });

    it('queries DB on Cache MISS and automatically populates Cache for next request', () => {
      const server = new ServerModel('srv-1');
      const redis = new RedisModel('cache-1');
      const db = new DatabaseModel('db-1');

      const missResult = server.processRequest(
        {
          id: 'req-miss',
          traceId: 'trc-2',
          clientNodeId: 'c1',
          method: 'GET',
          path: '/api/users/999',
          key: 'user:999',
          createdAt: 0,
          currentHop: 'srv-1',
          history: [],
          status: 'in-flight'
        },
        redis,
        db,
        0
      );

      expect(missResult.cacheHit).toBe(false);
      expect(db.totalQueries).toBe(1);

      const secondCheck = redis.get('user:999', 0);
      expect(secondCheck.hit).toBe(true);
    });
  });

  describe('Full Topology Simulation Engine (Hop-by-Hop)', () => {
    it('executes a request hop-by-hop across Client -> LB -> Server -> Redis -> DB and back', () => {
      const engine = new SimulationEngine();

      // Build a blank-canvas topology: Client -> LB -> Server -> (Redis, DB)
      const nodes: Node<NodeData>[] = [
        { id: 'client-1', type: 'systemNode', position: { x: 60, y: 220 }, data: { label: 'Client', type: 'client', status: 'healthy', metrics: baseMetrics, config: { requestType: 'GET' } } },
        { id: 'lb-1', type: 'systemNode', position: { x: 340, y: 220 }, data: { label: 'LB', type: 'load-balancer', status: 'healthy', metrics: baseMetrics, config: { algorithm: 'round-robin', maxConnections: 1000 } } },
        { id: 'server-1', type: 'systemNode', position: { x: 660, y: 220 }, data: { label: 'Server', type: 'app-server', status: 'healthy', metrics: baseMetrics, config: { maxWorkers: 8, downstreamTimeoutMs: 5000 } } },
        { id: 'cache-1', type: 'systemNode', position: { x: 980, y: 110 }, data: { label: 'Redis', type: 'redis-cache', status: 'healthy', metrics: baseMetrics, config: { ttlSeconds: 60, thunderingHerd: false } } },
        { id: 'db-1', type: 'systemNode', position: { x: 980, y: 330 }, data: { label: 'Postgres', type: 'sql-database', status: 'healthy', metrics: baseMetrics, config: { maxConnections: 50, baseReadLatencyMs: 20 } } }
      ];

      const edges: Edge[] = [
        { id: 'e1', source: 'client-1', target: 'lb-1', type: 'removableEdge' },
        { id: 'e2', source: 'lb-1', target: 'server-1', type: 'removableEdge' },
        { id: 'e3', source: 'server-1', target: 'cache-1', type: 'removableEdge' },
        { id: 'e4', source: 'cache-1', target: 'db-1', type: 'removableEdge' },
        { id: 'e5', source: 'server-1', target: 'db-1', type: 'removableEdge' }
      ];

      engine.syncTopology(nodes, edges);
      engine.triggerBatch(1);
      engine.clock.resume();
      engine.clock.step(2000); // advance virtual time so the client spawns

      // Run enough ticks for the full request/response round-trip
      let result: any = null;
      const allLogs: any[] = [];
      for (let i = 0; i < 700; i++) {
        result = engine.tick(nodes, edges);
        allLogs.push(...(result.newLogs || []));
        if (result.shouldAutoPause) break;
      }

      expect(result).toBeDefined();
      // A response should have come back to the client
      expect(result.globalMetrics.totalResponses).toBeGreaterThanOrEqual(1);
      // Logs should document the hop-by-hop journey
      const hasServerLog = allLogs.some((l) => l.nodeType === 'app-server');
      const hasDbLog = allLogs.some((l) => l.nodeType === 'sql-database');
      expect(hasServerLog).toBe(true);
      expect(hasDbLog).toBe(true);
    });

    it('returns 503 when LB target server is at connection ceiling', () => {
      const engine = new SimulationEngine();
      const nodes: Node<NodeData>[] = [
        { id: 'client-1', type: 'systemNode', position: { x: 60, y: 220 }, data: { label: 'Client', type: 'client', status: 'healthy', metrics: baseMetrics, config: { requestType: 'GET' } } },
        { id: 'lb-1', type: 'systemNode', position: { x: 340, y: 220 }, data: { label: 'LB', type: 'load-balancer', status: 'healthy', metrics: baseMetrics, config: { algorithm: 'round-robin', maxConnections: 0 } } },
        { id: 'server-1', type: 'systemNode', position: { x: 660, y: 220 }, data: { label: 'Server', type: 'app-server', status: 'dead', metrics: baseMetrics, config: { maxWorkers: 8 } } }
      ];

      const edges: Edge[] = [
        { id: 'e1', source: 'client-1', target: 'lb-1', type: 'removableEdge' },
        { id: 'e2', source: 'lb-1', target: 'server-1', type: 'removableEdge' }
      ];

      engine.syncTopology(nodes, edges);
      engine.triggerBatch(1);
      engine.clock.resume();
      engine.clock.step(2000);
      let result: any = null;
      for (let i = 0; i < 400; i++) {
        result = engine.tick(nodes, edges);
        if (result.shouldAutoPause) break;
      }

      expect(result.globalMetrics.totalResponseErrors).toBeGreaterThanOrEqual(1);
    });
  });
});
