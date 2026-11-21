import { CacheEntry } from '../types';

export interface RedisConfig {
  maxMemoryMb: number;
  evictionPolicy: 'LRU' | 'LFU' | 'TTL' | 'noeviction';
  defaultTTL: number; // seconds
}

export class RedisModel {
  public id: string;
  public config: RedisConfig;
  private store: Map<string, CacheEntry> = new Map();
  public hits: number = 0;
  public misses: number = 0;
  public evictions: number = 0;

  constructor(id: string, config?: Partial<RedisConfig>) {
    this.id = id;
    this.config = {
      maxMemoryMb: 256,
      evictionPolicy: 'LRU',
      defaultTTL: 60,
      ...config
    };

    // REDIS STARTS 100% EMPTY! NO HARDCODED OR FAKE DATA!
    // Every first request MUST miss and go to DB!
  }

  public get(key: string, currentTimeMs: number): { hit: boolean; value?: string; latencyMs: number } {
    this.cleanupExpired(currentTimeMs);

    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return { hit: false, latencyMs: 0.5 };
    }

    if (currentTimeMs >= entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return { hit: false, latencyMs: 0.5 };
    }

    // Real cache hit!
    entry.lastAccessed = currentTimeMs;
    entry.accessCount++;
    this.hits++;
    return { hit: true, value: entry.value, latencyMs: 0.8 };
  }

  public set(key: string, value: string, ttlSeconds: number = this.config.defaultTTL, currentTimeMs: number = 0): void {
    const sizeBytes = key.length + value.length + 64;

    if (this.getCurrentMemoryBytes() + sizeBytes > this.config.maxMemoryMb * 1024 * 1024) {
      this.evict();
    }

    const expiresAt = currentTimeMs + ttlSeconds * 1000;
    this.store.set(key, {
      key,
      value,
      sizeBytes,
      createdAt: currentTimeMs,
      expiresAt,
      lastAccessed: currentTimeMs,
      accessCount: 1
    });
  }

  public delete(key: string): boolean {
    return this.store.delete(key);
  }

  public cleanupExpired(currentTimeMs: number): void {
    for (const [key, entry] of this.store.entries()) {
      if (currentTimeMs >= entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  private evict(): void {
    if (this.store.size === 0) return;

    if (this.config.evictionPolicy === 'LRU') {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [key, entry] of this.store.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }
      if (oldestKey) {
        this.store.delete(oldestKey);
        this.evictions++;
      }
    } else if (this.config.evictionPolicy === 'LFU') {
      let lowestKey: string | null = null;
      let minAccess = Infinity;
      for (const [key, entry] of this.store.entries()) {
        if (entry.accessCount < minAccess) {
          minAccess = entry.accessCount;
          lowestKey = key;
        }
      }
      if (lowestKey) {
        this.store.delete(lowestKey);
        this.evictions++;
      }
    } else {
      const firstKey = this.store.keys().next().value;
      if (firstKey) {
        this.store.delete(firstKey);
        this.evictions++;
      }
    }
  }

  public getCurrentMemoryBytes(): number {
    let bytes = 0;
    for (const entry of this.store.values()) {
      bytes += entry.sizeBytes;
    }
    return bytes;
  }

  public getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0.0 : this.hits / total;
  }

  public getEntries(): CacheEntry[] {
    return Array.from(this.store.values());
  }

  public clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }
}
