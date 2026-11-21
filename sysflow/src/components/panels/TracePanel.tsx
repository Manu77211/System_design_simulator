// sysflow/src/components/panels/TracePanel.tsx
// Distributed tracing waterfall: groups spans by traceId and shows hop-by-hop timing.
import React, { useMemo, useState } from 'react';
import { Minimize, Maximize, X, Activity, Layers } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

const PANEL_HEIGHT = 'h-64';

const STATUS_COLOR: Record<string, string> = {
  success: 'text-emerald-400',
  slow: 'text-amber-400',
  error: 'text-rose-400'
};

type TraceSpan = {
  traceId: string;
  spanId: string;
  nodeId: string;
  nodeLabel: string;
  action: string;
  startTime: number;
  durationMs: number;
  status: 'success' | 'slow' | 'error';
};

export const TracePanel: React.FC = () => {
  const { traceSpans } = useCanvasStore();
  const [isOpen, setIsOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);

  // Group spans by traceId
  const traces = useMemo(() => {
    const byTrace = new Map<string, TraceSpan[]>();
    for (const span of traceSpans) {
      const arr = byTrace.get(span.traceId) || [];
      arr.push(span);
      byTrace.set(span.traceId, arr);
    }
    return Array.from(byTrace.entries()).map(([traceId, spans]) => ({
      traceId,
      spans: spans.sort((a, b) => a.startTime - b.startTime)
    }));
  }, [traceSpans]);

  const toggleMax = () => setMaximized((m) => !m);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-slate-800/80 bg-[#060a11] backdrop-blur-md ${
        maximized ? 'h-3/4' : PANEL_HEIGHT
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/60 bg-slate-900/80">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span>Distributed Trace Waterfall</span>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
            {traces.length} traces
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleMax}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            title={maximized ? 'Restore' : 'Maximize'}
          >
            {maximized ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close trace panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {traces.length === 0 ? (
          <div className="text-slate-600 text-center pt-16 italic text-xs">
            <Activity className="w-5 h-5 mx-auto mb-2 text-slate-600" />
            <div>No traces yet</div>
            <div className="text-[10px] text-slate-500 mt-1">
              Send requests to see distributed traces per hop
            </div>
          </div>
        ) : (
          <>
            {traces.map(({ traceId, spans }) => {
              const totalMs = spans.reduce((s, p) => s + p.durationMs, 0);
              const firstNode = spans[0];
              const lastNode = spans[spans.length - 1];
              return (
                <div
                  key={traceId}
                  className="border border-slate-800/50 rounded-lg bg-[#0b0f17]/60 overflow-hidden"
                >
                  {/* Trace header */}
                  <div className="px-3 py-2 bg-slate-900/40 border-b border-slate-800/30 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3 h-3 text-purple-400 shrink-0" />
                      <span className="text-xs font-mono text-purple-300 truncate max-w-[200px]">
                        {traceId}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="text-slate-400">{spans.length} hops</span>
                      <span className={`font-mono ${STATUS_COLOR[lastNode?.status || 'success']}`}>
                        {totalMs} ms
                      </span>
                      <span
                        className={`font-mono ${STATUS_COLOR[lastNode?.status || 'success']}`}
                      >
                        {lastNode?.status === 'error' ? 'FAILED' : 'OK'}
                      </span>
                    </div>
                  </div>

                  {/* Span list */}
                  <div className="divide-y divide-slate-900/50">
                    {spans.map((span, i) => (
                      <div
                        key={span.spanId}
                        className="px-3 py-1.5 text-[10px] flex items-center gap-2"
                      >
                        <span className={`w-16 font-mono text-slate-500 truncate`}>
                          {span.nodeLabel}
                        </span>
                        <span className={`w-10 font-mono text-slate-400 truncate ${STATUS_COLOR[span.status]}`}>
                          {span.action}
                        </span>
                        <span className="w-10 font-mono text-slate-300">{span.durationMs}ms</span>
                        <span
                          className={`w-12 font-mono text-slate-300 capitalize ${STATUS_COLOR[span.status]}`}
                        >
                          {span.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};
