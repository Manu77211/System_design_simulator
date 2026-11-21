import React from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  Zap,
  Terminal,
  HelpCircle
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

export const MetricsBar: React.FC = () => {
  const { globalMetrics, nodes, mode } = useCanvasStore();

  const deadCount = nodes.filter((n) => n.data.status === 'dead').length;
  const healthyCount = nodes.filter((n) => n.data.status === 'healthy').length;

  return (
    <footer className="h-11 bg-slate-900/95 border-t border-slate-800/80 px-5 flex items-center justify-between text-xs font-mono z-20 backdrop-blur-md">
      {/* Live System Gauges */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-500">Throughput:</span>
          <span className="font-semibold text-slate-200">
            {globalMetrics.currentRps.toLocaleString()} req/s
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-500">Responses:</span>
          <span className="font-semibold text-slate-200">
            {globalMetrics.totalResponses}
          </span>
          {globalMetrics.totalResponseErrors > 0 && (
            <>
              <span className="text-slate-600">/</span>
              <span className="text-rose-400 font-semibold">
                {globalMetrics.totalResponseErrors} errors
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-500">P50:</span>
          <span className="font-semibold text-slate-200">
            {globalMetrics.p50LatencyMs.toFixed(1)}ms
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-500">P99:</span>
          <span className="font-semibold text-slate-200">
            {globalMetrics.p99LatencyMs.toFixed(1)}ms
          </span>
        </div>

        <div className="flex items-center gap-2">
          <AlertTriangle
            className={`w-3.5 h-3.5 ${
              globalMetrics.errorRate > 0.05 ? 'text-rose-500 animate-pulse' : 'text-slate-500'
            }`}
          />
          <span className="text-slate-500">Error Rate:</span>
          <span
            className={`font-semibold ${
              globalMetrics.errorRate > 0.05 ? 'text-rose-400' : 'text-slate-200'
            }`}
          >
            {(globalMetrics.errorRate * 100).toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-500">Nodes:</span>
          <span className="text-emerald-400 font-semibold">{healthyCount} healthy</span>
          {deadCount > 0 && (
            <span className="text-rose-400 font-semibold">({deadCount} dead)</span>
          )}
        </div>
      </div>

      {/* Mode status & shortcut hint */}
      <div className="flex items-center gap-4 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">
            {mode === 'live' ? 'Live Reality Plane Active' : 'Simulation Engine Running (60 FPS)'}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1 text-slate-600">
          <HelpCircle className="w-3 h-3" />
          <span>Right-click node to Kill / Revive</span>
        </div>
      </div>
    </footer>
  );
};
