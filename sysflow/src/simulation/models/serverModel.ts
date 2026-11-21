import { RedisModel } from './redisModel';
import { DatabaseModel } from './databaseModel';
import { SimulationRequest } from '../types';

export interface ServerExecutionResult {
  success: boolean;
  cacheHit: boolean;
  totalLatencyMs: number;
  statusCode: number;
  hops: Array<{
    from: string;
    to: string;
    action: string;
    durationMs: number;
    hit?: boolean;
  }>;
  errorReason?: string;
}

export class ServerModel {
  public id: string;
  public activeWorkers: number = 0;
  public maxWorkers: number = 10;
  public cpuUsage: number = 2; // Idle: 2%
  public memoryUsageMb: number = 120;
  public totalProcessed: number = 0;
  public totalErrors: number = 0;

  constructor(id: string, maxWorkers: number = 10) {
    this.id = id;
    this.maxWorkers = maxWorkers;
  }

  public processRequest(
    req: SimulationRequest,
    cache: RedisModel | null,
    db: DatabaseModel | null,
    currentTimeMs: number
  ): ServerExecutionResult {
    this.totalProcessed++;
    this.activeWorkers++;

    // CPU surges dynamically based on concurrent worker saturation
    this.cpuUsage = Math.min(95, Math.round(25 + (this.activeWorkers / this.maxWorkers) * 65));
    this.memoryUsageMb = 120 + this.activeWorkers * 12;

    const hops: ServerExecutionResult['hops'] = [];
    let cacheHit = false;
    let accumulatedLatency = 1.5;

    // 1. Process GET (Read) Request
    if (req.method === 'GET') {
      // Step A: Check Redis first
      if (cache) {
        const cacheResult = cache.get(req.key, currentTimeMs);
        accumulatedLatency += cacheResult.latencyMs;

        if (cacheResult.hit) {
          cacheHit = true;
          hops.push({
            from: this.id,
            to: cache.id,
            action: 'CACHE_HIT',
            durationMs: cacheResult.latencyMs,
            hit: true
          });

          // CACHE HIT: return immediately! DB is NEVER queried!
          this.releaseWorker();
          return {
            success: true,
            cacheHit: true,
            totalLatencyMs: Math.round(accumulatedLatency),
            statusCode: 200,
            hops
          };
        } else {
          // Cache Miss!
          hops.push({
            from: this.id,
            to: cache.id,
            action: 'CACHE_MISS',
            durationMs: cacheResult.latencyMs,
            hit: false
          });
        }
      }

      // Step B: Cache Missed or No Cache -> Query Database
      if (db) {
        const dbResult = db.executeQuery(false);
        accumulatedLatency += dbResult.latencyMs + dbResult.queueDelayMs;

        if (!dbResult.success) {
          this.totalErrors++;
          this.releaseWorker();
          return {
            success: false,
            cacheHit: false,
            totalLatencyMs: Math.round(accumulatedLatency),
            statusCode: 503,
            hops,
            errorReason: dbResult.errorReason
          };
        }

        hops.push({
          from: this.id,
          to: db.id,
          action: 'DB_READ_QUERY',
          durationMs: dbResult.latencyMs + dbResult.queueDelayMs
        });

        // Step C: Write row into cache so subsequent requests hit cache!
        if (cache) {
          cache.set(req.key, JSON.stringify({ id: req.key, data: 'Fetched from DB' }), 60, currentTimeMs);
          hops.push({
            from: this.id,
            to: cache.id,
            action: 'CACHE_SET_POPULATE',
            durationMs: 0.8
          });
        }

        db.releaseConnection();
      }
    } else {
      // 2. Process POST (Write / Mutate) Request
      if (db) {
        const dbResult = db.executeQuery(true);
        accumulatedLatency += dbResult.latencyMs;

        hops.push({
          from: this.id,
          to: db.id,
          action: 'DB_WRITE_TRANSACTION',
          durationMs: dbResult.latencyMs
        });

        if (cache) {
          cache.delete(req.key);
          hops.push({
            from: this.id,
            to: cache.id,
            action: 'CACHE_INVALIDATE',
            durationMs: 0.8
          });
        }

        db.releaseConnection();
      }
    }

    this.releaseWorker();

    return {
      success: true,
      cacheHit: false,
      totalLatencyMs: Math.round(accumulatedLatency),
      statusCode: req.method === 'POST' ? 201 : 200,
      hops
    };
  }

  private releaseWorker(): void {
    if (this.activeWorkers > 0) {
      this.activeWorkers--;
    }
    if (this.activeWorkers === 0) {
      this.cpuUsage = 2; // Idle
      this.memoryUsageMb = 120;
    } else {
      this.cpuUsage = Math.max(2, Math.round(15 + (this.activeWorkers / this.maxWorkers) * 50));
    }
  }

  public decayTick(): void {
    if (this.activeWorkers === 0 && this.cpuUsage > 2) {
      this.cpuUsage = Math.max(2, Math.round(this.cpuUsage * 0.8));
    }
  }

  public reset(): void {
    this.activeWorkers = 0;
    this.cpuUsage = 2;
    this.memoryUsageMb = 120;
    this.totalProcessed = 0;
    this.totalErrors = 0;
  }
}
