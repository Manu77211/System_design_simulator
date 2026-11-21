import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2, X, ChevronDown } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { SimulationLog } from '../../simulation/types';

const LEVEL_COLORS: Record<SimulationLog['level'], string> = {
  info:    'text-slate-400',
  warn:    'text-amber-400',
  error:   'text-rose-400',
  success: 'text-emerald-400'
};

const LEVEL_DOT: Record<SimulationLog['level'], string> = {
  info:    'bg-slate-500',
  warn:    'bg-amber-400',
  error:   'bg-rose-500',
  success: 'bg-emerald-400'
};

const NODE_TYPE_COLOR: Record<string, string> = {
  'client':        'text-sky-400',
  'load-balancer': 'text-cyan-400',
  'app-server':    'text-teal-400',
  'redis-cache':   'text-violet-400',
  'sql-database':  'text-amber-400',
  'api-gateway':   'text-purple-400',
  'cdn':           'text-cyan-300',
  'message-queue': 'text-orange-400'
};

function formatSimTime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const rem = ms % 1000;
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}.${String(rem).padStart(3, '0')}`;
}

export const LogPanel: React.FC = () => {
  const { logs, logPanelOpen, toggleLogPanel, clearLogs } = useCanvasStore();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logPanelOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, logPanelOpen]);

  if (!logPanelOpen) return null;

  return (
    <div className="h-52 bg-[#060a11] border-t border-slate-800/80 flex flex-col z-10 shrink-0">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-slate-800/60 bg-slate-900/50">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Live Execution Log</span>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
            {logs.length} lines
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearLogs}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleLogPanel}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close log panel"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log lines */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed px-3 py-2 space-y-0.5"
      >
        {logs.length === 0 ? (
          <div className="text-slate-600 text-center pt-6 italic text-xs">
            Waiting for requests… Drag components onto the canvas and send a probe.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 hover:bg-slate-900/40 rounded px-1 py-0.5">
              {/* Timestamp */}
              <span className="text-slate-600 shrink-0 w-16">{formatSimTime(log.simTime)}</span>

              {/* Level dot */}
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${LEVEL_DOT[log.level]}`} />

              {/* Node label */}
              <span className={`shrink-0 w-28 truncate font-semibold ${NODE_TYPE_COLOR[log.nodeType] || 'text-slate-400'}`}>
                [{log.nodeLabel}]
              </span>

              {/* Message */}
              <span className={LEVEL_COLORS[log.level]}>{log.message}</span>

              {/* Request ID badge */}
              {log.requestId && (
                <span className="ml-auto shrink-0 text-[9px] text-slate-600 font-mono">
                  {log.requestId.slice(-6)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
