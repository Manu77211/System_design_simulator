import React, { useState } from 'react';
import {
  Play, Pause, RotateCcw, Gauge, Terminal, Activity,
  Send, Zap, Sparkles, Square, Infinity, ChevronDown,
  BookTemplate
} from 'lucide-react';
import { useCanvasStore, TEMPLATE_NODES, TEMPLATE_EDGES } from '../../store/canvasStore';

export const TopBar: React.FC = () => {
  const {
    isPlaying,
    setIsPlaying,
    simulationSpeed,
    setSimulationSpeed,
    resetSimulation,
    triggerSingleRequest,
    triggerBurst,
    startContinuous,
    stopTraffic,
    mode,
    setMode,
    trafficMode,
    setTrafficMode,
    batchCount,
    setBatchCount,
    continuousRps,
    setContinuousRps,
    nodes,
    logPanelOpen,
    toggleLogPanel
  } = useCanvasStore();

  const [batchInput, setBatchInput] = useState(String(batchCount));
  const [rpsInput, setRpsInput] = useState(String(continuousRps));
  const [showTemplateHint, setShowTemplateHint] = useState(nodes.length === 0);

  const speedOptions = [0.25, 0.5, 1, 2, 5, 10];

  const handleLoadTemplate = () => {
    const store = useCanvasStore.getState();
    store.resetSimulation();
    // Load template nodes/edges via store
    useCanvasStore.setState({ nodes: [...TEMPLATE_NODES], edges: [...TEMPLATE_EDGES] });
    setShowTemplateHint(false);
  };

  const handleSend = () => {
    if (isPlaying && trafficMode === 'continuous') {
      stopTraffic();
    } else if (trafficMode === 'single') {
      triggerSingleRequest();
    } else if (trafficMode === 'batch') {
      const n = parseInt(batchInput) || batchCount;
      setBatchCount(n);
      triggerBurst(n);
    } else if (trafficMode === 'continuous') {
      const r = parseInt(rpsInput) || continuousRps;
      setContinuousRps(r);
      startContinuous();
    }
  };

  const isContinuousRunning = isPlaying && trafficMode === 'continuous';

  return (
    <header className="h-14 bg-slate-900/90 border-b border-slate-800/80 px-4 flex items-center justify-between z-20 backdrop-blur-md gap-3">
      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-extrabold text-sm tracking-tight text-white">SysFlow</h1>
            <span className="text-[9px] font-mono font-semibold px-1 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/50">v2.0</span>
          </div>
          <p className="text-[9px] text-slate-500 leading-none">Distributed System Simulator</p>
        </div>
      </div>

      {/* Template loader hint */}
      {showTemplateHint && (
        <button
          onClick={handleLoadTemplate}
          className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer shrink-0"
          title="Load a pre-built 6-node template to get started"
        >
          <BookTemplate className="w-3.5 h-3.5 text-sky-400" />
          Load Template
        </button>
      )}

      {/* Traffic Mode Selector */}
      <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
        {(['single', 'batch', 'continuous'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setTrafficMode(m)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer capitalize ${
              trafficMode === m
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {m === 'single' ? '1 Probe' : m === 'batch' ? 'Batch' : '∞ Flow'}
          </button>
        ))}
      </div>

      {/* Batch count input */}
      {trafficMode === 'batch' && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-slate-400">Count:</span>
          <input
            type="number"
            min={1} max={50000}
            value={batchInput}
            onChange={(e) => { setBatchInput(e.target.value); setBatchCount(parseInt(e.target.value) || 1); }}
            className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs font-mono text-slate-200 focus:border-sky-500 focus:outline-none"
          />
        </div>
      )}

      {/* Continuous RPS input */}
      {trafficMode === 'continuous' && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-slate-400">RPS:</span>
          <input
            type="number"
            min={1} max={50000}
            value={rpsInput}
            onChange={(e) => { setRpsInput(e.target.value); setContinuousRps(parseInt(e.target.value) || 1); }}
            className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs font-mono text-slate-200 focus:border-sky-500 focus:outline-none"
          />
        </div>
      )}

      {/* Send / Stop button */}
      <button
        onClick={handleSend}
        className={`flex items-center gap-1.5 py-1 px-3 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95 shrink-0 ${
          isContinuousRunning
            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
            : trafficMode === 'continuous'
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
        }`}
      >
        {isContinuousRunning ? (
          <><Square className="w-3 h-3 fill-current" /> Stop</>
        ) : trafficMode === 'single' ? (
          <><Send className="w-3 h-3 fill-current" /> Send Probe</>
        ) : trafficMode === 'batch' ? (
          <><Zap className="w-3 h-3 fill-current" /> Send Batch</>
        ) : (
          <><Infinity className="w-3 h-3" /> Start Flow</>
        )}
      </button>

      <div className="h-4 w-[1px] bg-slate-800 mx-0.5 shrink-0" />

      {/* Speed Controls */}
      <div className="flex items-center gap-1 text-xs shrink-0">
        <Gauge className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] text-slate-500 mr-0.5">Speed:</span>
        {speedOptions.map((speed) => (
          <button
            key={speed}
            onClick={() => setSimulationSpeed(speed)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
              simulationSpeed === speed
                ? 'bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>

      <div className="h-4 w-[1px] bg-slate-800 mx-0.5 shrink-0" />

      {/* Log Panel Toggle */}
      <button
        onClick={toggleLogPanel}
        className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
          logPanelOpen
            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-700/40'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`}
        title="Toggle live execution log"
      >
        <Terminal className="w-3.5 h-3.5" />
        Logs
      </button>

      {/* Reset */}
      <button
        onClick={resetSimulation}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
        title="Clear canvas & reset simulation"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Mode Switcher */}
      <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium shrink-0">
        <button
          onClick={() => setMode('simulated')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
            mode === 'simulated' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3 h-3" /> Simulated
        </button>
        <button
          onClick={() => setMode('live')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
            mode === 'live' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3 h-3" /> Live
        </button>
      </div>
    </header>
  );
};
