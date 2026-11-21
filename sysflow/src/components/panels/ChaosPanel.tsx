// sysflow/src/components/panels/ChaosPanel.tsx
// Chaos Monkey controls: inject latency and packet drops into the simulation.
import React, { useState } from 'react';
import { Zap, AlertTriangle, Minimize, Maximize, X } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

const PANEL_HEIGHT = 'h-64';

export const ChaosPanel: React.FC = () => {
  const { chaosLatency, chaosDrop, setChaos, isPlaying } = useCanvasStore();
  const [isOpen, setIsOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);

  const toggleChaos = () => setIsOpen((o) => !o);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-slate-800/80 bg-[#060a11] backdrop-blur-md ${
        maximized ? 'h-3/4' : PANEL_HEIGHT
      } ${isOpen ? '' : 'hidden'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/60 bg-slate-900/80">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Chaos Monkey</span>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
            {(chaosDrop * 100).toFixed(0)}% drop / {chaosLatency}ms lag
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleChaos}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            title={isOpen ? 'Close' : 'Open'}
          >
            {isOpen ? <X className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium text-slate-300">Network Latency</span>
            </div>
            <span className="text-xs font-mono text-amber-400">{chaosLatency} ms</span>
          </div>
          <input
            type="range"
            min="0" max="2000" step="100"
            value={chaosLatency}
            onChange={(e) => setChaos(parseInt(e.target.value), chaosDrop)}
            className="w-full accent-amber-500"
          />
          <p className="text-[10px] text-slate-500">
            Slows every packet so requests take longer to traverse the graph.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-xs font-medium text-slate-300">Packet Drop Rate</span>
            </div>
            <span className="text-xs font-mono text-rose-400">{chaosDrop * 100}%</span>
          </div>
          <input
            type="range"
            min="0" max="100" step="5"
            value={chaosDrop * 100}
            onChange={(e) => setChaos(chaosLatency, parseInt(e.target.value) / 100)}
            className="w-full accent-rose-500"
          />
          <p className="text-[10px] text-slate-500">
            Randomly drops packets mid-flight (simulates network failure / 503).
          </p>
        </div>

        <div className="bg-slate-950/50 border border-slate-800 rounded p-2">
          <p className="text-[10px] text-slate-400">
            <span className="text-slate-300 font-bold">Tip:</span> Enable chaos while traffic is running to watch CPU meters surge and error rate climb in real time.
          </p>
        </div>
      </div>
    </div>
  );
};
