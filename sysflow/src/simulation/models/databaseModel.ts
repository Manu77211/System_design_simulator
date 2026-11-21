export interface DatabaseConfig {
  maxConnections: number;
  maxQueueDepth: number;
  baseQueryLatencyMs: number;
  baseWriteLatencyMs: number;
}

export class DatabaseModel {
  public id: string;
  public config: DatabaseConfig;
  public activeConnections: number = 0;
  public queryQueueLength: number = 0;
  public totalQueries: number = 0;
  public rejectedQueries: number = 0;
  public cpuUsage: number = 3; // Idle: 3%

  constructor(id: string, config?: Partial<DatabaseConfig>) {
    this.id = id;
    this.config = {
      maxConnections: 50,
      maxQueueDepth: 200,
      baseQueryLatencyMs: 25,
      baseWriteLatencyMs: 45,
      ...config
    };
  }

  public executeQuery(isWrite: boolean = false): {
    success: boolean;
    latencyMs: number;
    queueDelayMs: number;
    errorReason?: string;
  } {
    this.totalQueries++;

    // Connection pool saturation check
    if (this.activeConnections >= this.config.maxConnections) {
      if (this.queryQueueLength >= this.config.maxQueueDepth) {
        this.rejectedQueries++;
        return {
          success: false,
          latencyMs: 5,
          queueDelayMs: 0,
          errorReason: 'FATAL: PostgreSQL Connection Pool Exhausted (Too Many Clients)'
        };
      }

      this.queryQueueLength++;
      const queueDelay = (this.queryQueueLength / this.config.maxConnections) * this.config.baseQueryLatencyMs;
      const baseTime = isWrite ? this.config.baseWriteLatencyMs : this.config.baseQueryLatencyMs;
      const degradedLatency = this.calculateDegradedLatency(baseTime);

      // CPU surges under queue pressure
      this.cpuUsage = Math.min(100, Math.round(55 + (this.queryQueueLength / this.config.maxQueueDepth) * 45));

      return {
        success: true,
        latencyMs: degradedLatency,
        queueDelayMs: queueDelay
      };
    }

    // Leased an active connection
    this.activeConnections++;
    // CPU dynamically surges based on connection load
    this.cpuUsage = Math.min(95, Math.round(15 + (this.activeConnections / this.config.maxConnections) * 80));

    const baseTime = isWrite ? this.config.baseWriteLatencyMs : this.config.baseQueryLatencyMs;
    const latency = this.calculateDegradedLatency(baseTime);

    return {
      success: true,
      latencyMs: latency,
      queueDelayMs: 0
    };
  }

  public releaseConnection(): void {
    if (this.activeConnections > 0) {
      this.activeConnections--;
    }
    if (this.queryQueueLength > 0) {
      this.queryQueueLength--;
    }
    // Smoothly decay CPU back towards idle
    if (this.activeConnections === 0 && this.queryQueueLength === 0) {
      this.cpuUsage = 3;
    } else {
      this.cpuUsage = Math.max(3, Math.round(10 + (this.activeConnections / this.config.maxConnections) * 60));
    }
  }

  /**
   * Passive tick to decay CPU towards idle (3%) if no active queries
   */
  public decayTick(): void {
    if (this.activeConnections === 0 && this.queryQueueLength === 0) {
      if (this.cpuUsage > 3) {
        this.cpuUsage = Math.max(3, Math.round(this.cpuUsage * 0.85));
      }
    }
  }

  private calculateDegradedLatency(baseMs: number): number {
    const loadFactor = this.activeConnections / this.config.maxConnections;
    const multiplier = 1 + Math.pow(loadFactor, 2.5) * 4;
    return Math.round(baseMs * multiplier);
  }

  public reset(): void {
    this.activeConnections = 0;
    this.queryQueueLength = 0;
    this.totalQueries = 0;
    this.rejectedQueries = 0;
    this.cpuUsage = 3;
  }
}
