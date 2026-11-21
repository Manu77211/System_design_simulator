import React, { useState } from 'react';
import {
  X, Skull, RotateCcw, Trash2, Activity, Sliders, Flame,
  Zap, Database, Bomb, Plus, Server, Shield, Layers
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

// ─── Reusable UI pieces ────────────────────────────────────────────────────

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-xs py-0.5">
    <span className="text-slate-500">{label}</span>
    <span className="font-mono text-slate-300">{value}</span>
  </div>
);

const Slider: React.FC<{
  label: string; value: number; min: number; max: number; step?: number;
  unit?: string; color?: string; onChange: (v: number) => void;
}> = ({ label, value, min, max, step = 1, unit = '', color = 'accent-sky-400', onChange }) => (
  <div className="space-y-1">
    <label className="flex justify-between text-xs text-slate-400">
      <span>{label}</span>
      <span className="font-mono text-slate-300">{value}{unit}</span>
    </label>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full ${color}`} />
  </div>
);

const Select: React.FC<{
  label: string; value: string; options: { v: string; l: string }[];
  onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div className="space-y-1">
    <label className="text-xs text-slate-400">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 px-2 text-xs text-slate-200 font-mono focus:border-sky-400 focus:outline-none">
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

const Toggle: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void; desc?: string }> = ({ label, value, onChange, desc }) => (
  <div className="flex items-start justify-between gap-2 py-1">
    <div>
      <div className="text-xs text-slate-300 font-medium">{label}</div>
      {desc && <div className="text-[10px] text-slate-500 mt-0.5">{desc}</div>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`relative shrink-0 w-9 h-5 rounded-full transition-colors cursor-pointer ${value ? 'bg-sky-600' : 'bg-slate-700'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

const Section: React.FC<{ title: string; icon: React.ReactNode; color?: string; children: React.ReactNode }> = ({ title, icon, color = 'text-sky-400', children }) => (
  <div className="mt-4 p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
    <h4 className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${color}`}>
      {icon} {title}
    </h4>
    {children}
  </div>
);

// ─── Main ConfigPanel ──────────────────────────────────────────────────────

export const ConfigPanel: React.FC = () => {
  const {
    nodes, selectedNodeId, setSelectedNodeId,
    killNode, reviveNode, deleteSelectedNode,
    updateNodeConfig, cacheEntries, flushCache, addCacheKey
  } = useCanvasStore();

  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <div className="w-72 bg-slate-900/95 border-l border-slate-800/80 p-5 flex flex-col justify-center h-full z-20 backdrop-blur-md text-center text-slate-500">
        <Sliders className="w-8 h-8 mx-auto mb-2 text-slate-700" />
        <h3 className="text-xs font-semibold text-slate-400">No Component Selected</h3>
        <p className="text-[11px] text-slate-600 mt-1">
          Click any node on the canvas to inspect its live state and configure parameters.
        </p>
      </div>
    );
  }

  const { data } = node;
  const cfg = data.config || {};
  const isDead = data.status === 'dead';
  const up = (c: Record<string, any>) => updateNodeConfig(node.id, c);

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    addCacheKey(newKey.trim(), newVal.trim() || '{"cached":true}', cfg.ttlSeconds || 60);
    setNewKey(''); setNewVal('');
  };

  return (
    <div className="w-72 bg-slate-900/95 border-l border-slate-800/80 p-3 flex flex-col h-full z-20 backdrop-blur-md overflow-y-auto text-slate-100 space-y-0.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <span className="text-[9px] font-mono uppercase tracking-widest text-sky-400">{data.type}</span>
          <h3 className="text-sm font-bold text-slate-100">{data.label}</h3>
        </div>
        <button onClick={() => setSelectedNodeId(null)}
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Node status + kill/revive */}
      <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Status</span>
          <span className={`font-mono uppercase font-bold text-[10px] px-2 py-0.5 rounded ${
            isDead ? 'bg-rose-950 text-rose-400 border border-rose-800/50' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
          }`}>{data.status}</span>
        </div>
        <div className="flex gap-2">
          {isDead ? (
            <button onClick={() => reviveNode(node.id)}
              className="flex-1 py-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Revive
            </button>
          ) : (
            <button onClick={() => killNode(node.id)}
              className="flex-1 py-1.5 px-3 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors">
              <Skull className="w-3.5 h-3.5" /> Kill (SIGTERM)
            </button>
          )}
          <button onClick={deleteSelectedNode}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live metrics */}
      <Section title="Live Metrics" icon={<Activity className="w-3.5 h-3.5" />} color="text-sky-400">
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-[9px] text-slate-500 block">CPU</span>
            <span className={`text-sm font-bold ${data.metrics.cpuUsage > 80 ? 'text-rose-400' : data.metrics.cpuUsage > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {data.metrics.cpuUsage}%
            </span>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-[9px] text-slate-500 block">Latency</span>
            <span className="text-sm font-bold text-slate-200">{data.metrics.avgLatencyMs.toFixed(1)} ms</span>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-[9px] text-slate-500 block">Memory</span>
            <span className="text-sm font-bold text-slate-200">{data.metrics.memoryUsage} MB</span>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800">
            <span className="text-[9px] text-slate-500 block">Connections</span>
            <span className="text-sm font-bold text-slate-200">{data.metrics.activeConnections}</span>
          </div>
        </div>
        {data.metrics.errorRate > 0 && (
          <div className="text-xs text-rose-400 font-mono bg-rose-950/30 border border-rose-800/40 rounded px-2 py-1">
            ⚠ Error Rate: {(data.metrics.errorRate * 100).toFixed(1)}%
          </div>
        )}
      </Section>

      {/* ── Component-specific config ──────────────────────────────────── */}

      {/* CLIENT */}
      {data.type === 'client' && (
        <Section title="Traffic Simulation" icon={<Zap className="w-3.5 h-3.5" />} color="text-sky-400">
          <Select label="Request Method" value={cfg.requestType || 'GET'}
            options={[
              { v: 'GET', l: 'GET — Read / query data' },
              { v: 'POST', l: 'POST — Create / write data' },
              { v: 'PUT', l: 'PUT — Update / replace data' },
              { v: 'DELETE', l: 'DELETE — Remove data' }
            ]}
            onChange={(v) => up({ requestType: v })} />
          <Select label="Traffic Pattern" value={cfg.pattern || 'constant'}
            options={[
              { v: 'constant', l: 'Constant — steady load' },
              { v: 'ramp', l: 'Ramp Up — gradual increase' },
              { v: 'spike', l: 'Traffic Spike — burst then settle' },
              { v: 'diurnal', l: 'Diurnal — day/night cycle' }
            ]}
            onChange={(v) => up({ pattern: v })} />
          <div className="text-[10px] text-slate-500 bg-slate-950/60 border border-slate-800 rounded px-2 py-1.5">
            Traffic controls in the top bar → select Single / Batch / ∞ Flow and configure RPS.
          </div>
        </Section>
      )}

      {/* LOAD BALANCER */}
      {data.type === 'load-balancer' && (
        <Section title="Load Balancer Config" icon={<Layers className="w-3.5 h-3.5" />} color="text-cyan-400">
          <Select label="Algorithm" value={cfg.algorithm || 'round-robin'}
            options={[
              { v: 'round-robin', l: 'Round Robin' },
              { v: 'least-connections', l: 'Least Connections' },
              { v: 'ip-hash', l: 'IP Hash (sticky)' },
              { v: 'weighted', l: 'Weighted Random' },
              { v: 'random', l: 'Random' }
            ]}
            onChange={(v) => up({ algorithm: v })} />
          <Slider label="Max Connections" value={cfg.maxConnections || 1000}
            min={100} max={100000} step={100} unit="" color="accent-cyan-400"
            onChange={(v) => up({ maxConnections: v })} />
          <Slider label="Health Check Interval" value={cfg.healthCheckIntervalMs || 5000}
            min={500} max={30000} step={500} unit=" ms" color="accent-cyan-400"
            onChange={(v) => up({ healthCheckIntervalMs: v })} />
          <Slider label="Unhealthy Threshold" value={cfg.unhealthyThreshold || 3}
            min={1} max={10} step={1} unit=" failures"
            onChange={(v) => up({ unhealthyThreshold: v })} />
          <Toggle label="Sticky Sessions" value={!!cfg.stickySession}
            desc="Routes same client to same server"
            onChange={(v) => up({ stickySession: v })} />
        </Section>
      )}

      {/* APP SERVER */}
      {data.type === 'app-server' && (
        <Section title="Server Config" icon={<Server className="w-3.5 h-3.5" />} color="text-teal-400">
          <Slider label="Worker Thread Pool" value={cfg.maxWorkers || 8}
            min={1} max={64} step={1} unit=" workers" color="accent-teal-400"
            onChange={(v) => up({ maxWorkers: v })} />
          <Slider label="Compute Latency" value={cfg.computeLatencyMs || 5}
            min={1} max={500} step={1} unit=" ms" color="accent-teal-400"
            onChange={(v) => up({ computeLatencyMs: v })} />
          <Slider label="Memory Ceiling" value={cfg.memoryCeilingMb || 1024}
            min={128} max={16384} step={128} unit=" MB" color="accent-teal-400"
            onChange={(v) => up({ memoryCeilingMb: v })} />
          <Slider label="Downstream Timeout" value={cfg.downstreamTimeoutMs || 5000}
            min={100} max={30000} step={100} unit=" ms" color="accent-teal-400"
            onChange={(v) => up({ downstreamTimeoutMs: v })} />
        </Section>
      )}

      {/* REDIS CACHE */}
      {data.type === 'redis-cache' && (
        <>
          <Section title="Cache Inspector" icon={<Zap className="w-3.5 h-3.5" />} color="text-violet-400">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Keys in Memory</span>
              <span className="font-mono text-violet-400 font-bold">{cacheEntries.length}</span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-[10px]">
              {cacheEntries.length === 0 ? (
                <div className="text-slate-600 italic text-center py-2">Cache is empty — all requests will MISS</div>
              ) : (
                cacheEntries.map((e) => (
                  <div key={e.key} className="flex justify-between items-center px-1.5 py-1 rounded bg-slate-950 border border-slate-800">
                    <span className="text-sky-300 font-bold">{e.key}</span>
                    <div className="flex gap-2 text-[9px]">
                      <span className="text-emerald-400">{e.accessCount} hits</span>
                      <span className="text-slate-500">TTL {cfg.ttlSeconds || 60}s</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => flushCache(node.id)}
              className="w-full py-1.5 rounded bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs flex items-center justify-center gap-1.5 cursor-pointer">
              <Bomb className="w-3.5 h-3.5" /> Flush Cache (Trigger Stampede)
            </button>
            <form onSubmit={handleAddKey} className="flex gap-1.5 pt-1 border-t border-slate-800">
              <input type="text" placeholder="key e.g. user:1" value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:border-violet-400 focus:outline-none" />
              <button type="submit"
                className="px-2 py-1 bg-violet-700 hover:bg-violet-600 text-white rounded text-xs flex items-center gap-1 cursor-pointer">
                <Plus className="w-3 h-3" /> Add
              </button>
            </form>
          </Section>

          <Section title="Redis Config" icon={<Sliders className="w-3.5 h-3.5" />} color="text-violet-400">
            <Slider label="Max Memory" value={cfg.maxMemoryMb || 256}
              min={16} max={65536} step={16} unit=" MB" color="accent-violet-400"
              onChange={(v) => up({ maxMemoryMb: v })} />
            <Select label="Eviction Policy" value={cfg.evictionPolicy || 'LRU'}
              options={[
                { v: 'LRU', l: 'LRU — Least Recently Used' },
                { v: 'LFU', l: 'LFU — Least Frequently Used' },
                { v: 'TTL', l: 'Volatile-TTL' },
                { v: 'allkeys-random', l: 'All Keys Random' },
                { v: 'noeviction', l: 'No Eviction (OOM error)' }
              ]}
              onChange={(v) => up({ evictionPolicy: v })} />
            <Slider label="Default TTL" value={cfg.ttlSeconds || 60}
              min={1} max={86400} step={1} unit=" s" color="accent-violet-400"
              onChange={(v) => up({ ttlSeconds: v })} />
            <Toggle label="Thundering Herd Protection" value={!!cfg.thunderingHerd}
              desc="Only 1 request queries DB on cache miss; others wait for the shared result"
              onChange={(v) => up({ thunderingHerd: v })} />
            <Toggle label="Write Invalidation" value={cfg.writeInvalidation !== false}
              desc="POST/PUT/DELETE requests evict matching cache key"
              onChange={(v) => up({ writeInvalidation: v })} />
          </Section>
        </>
      )}

      {/* SQL DATABASE */}
      {data.type === 'sql-database' && (
        <>
          <Section title="Connection Pool" icon={<Database className="w-3.5 h-3.5" />} color="text-amber-400">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Active</span>
              <span className="text-amber-400 font-bold">{data.metrics.activeConnections} / {cfg.maxConnections || 50}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className={`h-full transition-all ${data.metrics.activeConnections >= (cfg.maxConnections || 50) * 0.9 ? 'bg-rose-500' : data.metrics.activeConnections >= (cfg.maxConnections || 50) * 0.5 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(100, (data.metrics.activeConnections / (cfg.maxConnections || 50)) * 100)}%` }} />
            </div>
            <Row label="Query Queue" value={<span className={data.metrics.queueDepth > 0 ? 'text-amber-400' : 'text-slate-400'}>{data.metrics.queueDepth} waiting</span>} />
          </Section>

          <Section title="Database Config" icon={<Sliders className="w-3.5 h-3.5" />} color="text-amber-400">
            <Slider label="Max Connection Pool" value={cfg.maxConnections || 50}
              min={5} max={500} step={5} unit="" color="accent-amber-400"
              onChange={(v) => up({ maxConnections: v })} />
            <Slider label="Base Read Latency" value={cfg.baseReadLatencyMs || 20}
              min={1} max={2000} step={1} unit=" ms" color="accent-amber-400"
              onChange={(v) => up({ baseReadLatencyMs: v })} />
            <Slider label="Base Write Latency" value={cfg.baseWriteLatencyMs || 40}
              min={1} max={5000} step={1} unit=" ms" color="accent-amber-400"
              onChange={(v) => up({ baseWriteLatencyMs: v })} />
            <Select label="Index Mode" value={cfg.indexMode || 'btree'}
              options={[
                { v: 'btree', l: 'B-Tree Index (fast O(log n))' },
                { v: 'fullscan', l: 'Full Table Scan (slow O(n))' },
                { v: 'hash', l: 'Hash Index (O(1) exact match)' }
              ]}
              onChange={(v) => up({ indexMode: v })} />
            <Select label="Replication" value={cfg.replicationMode || 'none'}
              options={[
                { v: 'none', l: 'None (single instance)' },
                { v: 'async', l: 'Async replication' },
                { v: 'sync', l: 'Sync replication (slower writes)' }
              ]}
              onChange={(v) => up({ replicationMode: v })} />
            {cfg.replicationMode !== 'none' && cfg.replicationMode && (
              <Slider label="Replica Lag" value={cfg.replicaLagMs || 10}
                min={0} max={5000} step={5} unit=" ms" color="accent-amber-400"
                onChange={(v) => up({ replicaLagMs: v })} />
            )}
          </Section>
        </>
      )}

      {/* API GATEWAY */}
      {data.type === 'api-gateway' && (
        <Section title="Gateway Config" icon={<Shield className="w-3.5 h-3.5" />} color="text-purple-400">
          <Slider label="Rate Limit" value={cfg.rateLimit || 1000}
            min={10} max={100000} step={10} unit=" req/s" color="accent-purple-400"
            onChange={(v) => up({ rateLimit: v })} />
          <Select label="Auth Mode" value={cfg.authMode || 'jwt'}
            options={[
              { v: 'none', l: 'No Auth' },
              { v: 'jwt', l: 'JWT Bearer Token' },
              { v: 'apikey', l: 'API Key' },
              { v: 'oauth2', l: 'OAuth 2.0' }
            ]}
            onChange={(v) => up({ authMode: v })} />
        </Section>
      )}

      {/* CDN */}
      {data.type === 'cdn' && (
        <Section title="CDN Config" icon={<Zap className="w-3.5 h-3.5" />} color="text-cyan-400">
          <Slider label="Edge Cache Hit Rate" value={Math.round((cfg.edgeCacheHitRate || 0.6) * 100)}
            min={0} max={100} step={1} unit="%" color="accent-cyan-400"
            onChange={(v) => up({ edgeCacheHitRate: v / 100 })} />
          <Slider label="Edge Cache TTL" value={cfg.edgeTtlSeconds || 300}
            min={60} max={86400} step={60} unit=" s" color="accent-cyan-400"
            onChange={(v) => up({ edgeTtlSeconds: v })} />
        </Section>
      )}

      {/* MESSAGE QUEUE */}
      {data.type === 'message-queue' && (
        <Section title="Queue Config" icon={<Layers className="w-3.5 h-3.5" />} color="text-orange-400">
          <Slider label="Max Queue Depth" value={cfg.maxDepth || 10000}
            min={100} max={1000000} step={100} unit="" color="accent-orange-400"
            onChange={(v) => up({ maxDepth: v })} />
          <Select label="Delivery Mode" value={cfg.deliveryMode || 'at-least-once'}
            options={[
              { v: 'at-most-once', l: 'At-Most-Once (may lose)' },
              { v: 'at-least-once', l: 'At-Least-Once (may dup)' },
              { v: 'exactly-once', l: 'Exactly-Once (slow)' }
            ]}
            onChange={(v) => up({ deliveryMode: v })} />
        </Section>
      )}
    </div>
  );
};
