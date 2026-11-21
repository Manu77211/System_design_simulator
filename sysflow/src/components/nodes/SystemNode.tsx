import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Users,
  GitFork,
  Server,
  Zap,
  Database,
  Mail,
  Shield,
  Layers,
  Radio,
  Skull
} from 'lucide-react';
import { NodeData, ComponentType } from '../../types';
import { useCanvasStore } from '../../store/canvasStore';

const iconMap: Record<ComponentType, React.ReactNode> = {
  'client': <Users className="w-4 h-4 text-sky-400" />,
  'load-balancer': <GitFork className="w-4 h-4 text-cyan-400" />,
  'app-server': <Server className="w-4 h-4 text-emerald-400" />,
  'redis-cache': <Zap className="w-4 h-4 text-purple-400" />,
  'sql-database': <Database className="w-4 h-4 text-amber-400" />,
  'message-queue': <Mail className="w-4 h-4 text-rose-400" />,
  'api-gateway': <Shield className="w-4 h-4 text-indigo-400" />,
  'cdn': <Layers className="w-4 h-4 text-blue-400" />
};

const borderGlowMap: Record<ComponentType, string> = {
  'client': 'border-sky-500/30 group-hover:border-sky-400',
  'load-balancer': 'border-cyan-500/30 group-hover:border-cyan-400',
  'app-server': 'border-emerald-500/30 group-hover:border-emerald-400',
  'redis-cache': 'border-purple-500/30 group-hover:border-purple-400',
  'sql-database': 'border-amber-500/30 group-hover:border-amber-400',
  'message-queue': 'border-rose-500/30 group-hover:border-rose-400',
  'api-gateway': 'border-indigo-500/30 group-hover:border-indigo-400',
  'cdn': 'border-blue-500/30 group-hover:border-blue-400'
};

export const SystemNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = data as unknown as NodeData;
  const { killNode, reviveNode, setSelectedNodeId } = useCanvasStore();

  const isDead = nodeData.status === 'dead';

  const getStatusDot = () => {
    switch (nodeData.status) {
      case 'healthy':
        return <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />;
      case 'degraded':
        return <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />;
      case 'overloaded':
        return <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />;
      case 'dead':
        return <Skull className="w-3.5 h-3.5 text-rose-500" />;
    }
  };

  const statusAnimationClass = () => {
    switch (nodeData.status) {
      case 'healthy':
        return 'node-healthy';
      case 'degraded':
        return 'node-degraded';
      case 'overloaded':
        return 'node-overloaded';
      case 'dead':
        return 'node-dead';
    }
  };

  const cpuValue = nodeData.metrics?.cpuUsage ?? 2;

  return (
    <div
      onClick={() => setSelectedNodeId(id)}
      onContextMenu={(e) => {
        e.preventDefault();
        if (isDead) reviveNode(id);
        else killNode(id);
      }}
      className={`group relative min-w-[220px] rounded-xl bg-slate-900/90 backdrop-blur-md p-3.5 border transition-all duration-200 cursor-pointer shadow-xl ${
        borderGlowMap[nodeData.type]
      } ${statusAnimationClass()} ${
        selected ? 'ring-2 ring-sky-400 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.35)]' : ''
      }`}
    >
      {/* Input Handle (Left) */}
      {nodeData.type !== 'client' && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !-left-2 !bg-slate-900 !border-2 !border-sky-400 hover:!scale-125 transition-transform"
        />
      )}

      {/* Node Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
            {iconMap[nodeData.type]}
          </div>
          <span className="font-semibold text-xs text-slate-100 tracking-wide">
            {nodeData.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5" title={`Status: ${nodeData.status}`}>
          {getStatusDot()}
        </div>
      </div>

      {/* Mini Metrics / Live Reactive State */}
      <div className="space-y-1.5 text-[11px] font-mono text-slate-400">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">
            {nodeData.type === 'client' ? 'Active Users' : 'CPU Load'}
          </span>
          <div className="flex items-center gap-1.5">
            {nodeData.type === 'client' ? (
              <span className="text-sky-300 font-bold">{nodeData.config?.rps || 10}</span>
            ) : (
              <>
                <div className="w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ease-out ${
                      cpuValue > 75
                        ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                        : cpuValue > 35
                          ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                          : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.max(4, cpuValue)}%` }}
                  />
                </div>
                <span
                  className={`transition-colors duration-300 font-bold ${
                    cpuValue > 75 ? 'text-rose-400' : cpuValue > 35 ? 'text-amber-300' : 'text-slate-300'
                  }`}
                >
                  {cpuValue}%
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-slate-500">
            {nodeData.type === 'client'
              ? 'Request Method'
              : nodeData.type === 'redis-cache'
                ? 'Keys Cached'
                : 'Avg Latency'}
          </span>
          <span className="text-slate-300 font-medium">
            {nodeData.type === 'client'
              ? `${nodeData.config?.requestType || 'GET'} (Read)`
              : nodeData.type === 'redis-cache'
                ? `${useCanvasStore.getState().cacheEntries.length} items`
                : `${nodeData.metrics?.avgLatencyMs?.toFixed(1) || 0}ms`}
          </span>
        </div>

        {nodeData.liveProcess?.port && (
          <div className="flex justify-between items-center pt-1 border-t border-slate-800/60 text-[10px]">
            <span className="text-sky-400 flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              PORT
            </span>
            <span className="text-sky-300 font-bold bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/40">
              :{nodeData.liveProcess.port}
            </span>
          </div>
        )}
      </div>

      {/* Output Handle (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !-right-2 !bg-slate-900 !border-2 !border-sky-400 hover:!scale-125 transition-transform"
      />
    </div>
  );
};
