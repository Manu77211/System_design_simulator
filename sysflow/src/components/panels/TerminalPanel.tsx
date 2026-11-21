// sysflow/src/components/panels/TerminalPanel.tsx
// Simple text-based live terminal streaming worker-process logs from the backend.
import React, { useEffect, useRef, useState } from 'react';
import { X, Maximize, Minimize, Trash2, Terminal as TerminalIcon } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

const PANEL_HEIGHT = 'h-64';

export const TerminalPanel: React.FC = () => {
  const { logs, clearLogs, logPanelOpen } = useCanvasStore();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(logPanelOpen);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    setIsOpen(logPanelOpen);
  }, [logPanelOpen]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const toggleMax = () => setMaximized((m: boolean) => !m);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-slate-800/80 bg-[#060a11] backdrop-blur-md ${
        maximized ? 'h-3/4' : PANEL_HEIGHT
      }`}
    >
      {/* Terminal header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/60 bg-slate-900/80">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Live Process Terminal</span>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
            {logs.length} lines
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
            onClick={clearLogs}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Clear terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close terminal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal viewport */}
      <div
        ref={scrollRef}
        className="flex-1 bg-[#060a11] text-slate-200 font-mono text-[11px] overflow-y-auto p-3 space-y-0.5"
      >
        {logs.length === 0 ? (
          <div className="text-slate-600 text-center pt-12 italic text-xs">
            Waiting for process output… Switch to Live mode, add components, and send requests.
          </div>
        ) : (
          <>
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 break-all border-b border-slate-900 pb-1"
              >
                <span className="text-slate-600 shrink-0 w-16 text-[10px]">
                  {new Date(log.wallTime).toLocaleTimeString('en-US', { hour12: false })}
                </span>
                <span
                  className={`shrink-0 w-20 truncate font-semibold ${
                    log.nodeType === 'client'
                      ? 'text-sky-400'
                      : log.nodeType === 'load-balancer'
                        ? 'text-cyan-400'
                        : log.nodeType === 'app-server'
                          ? 'text-teal-400'
                          : log.nodeType === 'redis-cache'
                            ? 'text-violet-400'
                            : log.nodeType === 'sql-database'
                              ? 'text-amber-400'
                              : log.nodeType === 'api-gateway'
                                ? 'text-purple-400'
                                : log.nodeType === 'message-queue'
                                  ? 'text-orange-400'
                                  : log.nodeType === 'cdn'
                                    ? 'text-cyan-300'
                                    : 'text-slate-400'
                  }`}
                >
                  [{log.nodeId}]
                </span>
                <span className="text-slate-300 break-whitespace">{log.message}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
