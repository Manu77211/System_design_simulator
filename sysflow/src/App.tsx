import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge
} from '@xyflow/react';
import { useCanvasStore } from './store/canvasStore';
import { SystemNode } from './components/nodes/SystemNode';
import { RemovableEdge } from './components/canvas/RemovableEdge';
import { ParticleOverlay } from './components/canvas/ParticleOverlay';
import { TopBar } from './components/panels/TopBar';
import { ComponentPalette } from './components/panels/ComponentPalette';
import { ConfigPanel } from './components/panels/ConfigPanel';
import { MetricsBar } from './components/panels/MetricsBar';
import { LogPanel } from './components/panels/LogPanel';
import { TerminalPanel } from './components/panels/TerminalPanel';
import { NodeData } from './types';

export const App: React.FC = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
    setSelectedEdgeId,
    deleteEdge,
    deleteSelectedNode
  } = useCanvasStore();

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      systemNode: SystemNode
    }),
    []
  );

  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      removableEdge: RemovableEdge
    }),
    []
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdgeId(edge.id);
    },
    [setSelectedEdgeId]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [setSelectedNodeId, setSelectedEdgeId]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedEdgeId, selectedNodeId } = useCanvasStore.getState();
        if (selectedEdgeId) {
          deleteEdge(selectedEdgeId);
        } else if (selectedNodeId) {
          deleteSelectedNode();
        }
      }
    },
    [deleteEdge, deleteSelectedNode]
  );

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="flex flex-col h-screen w-screen bg-[#0b0f17] overflow-hidden text-slate-100 select-none outline-none"
    >
      {/* Top Header */}
      <TopBar />

      {/* Main Workspace (Palette + React Flow Canvas + Config Panel) */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Left Component Palette */}
        <ComponentPalette />

        {/* Central Visual Canvas */}
        <div className="flex-1 relative h-full">
          <ReactFlowProvider>
            <ReactFlow<Node<NodeData>>
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onEdgeClick={handleEdgeClick}
              onPaneClick={handlePaneClick}
              fitView
              minZoom={0.2}
              maxZoom={2.5}
              deleteKeyCode={['Backspace', 'Delete']}
              defaultEdgeOptions={{
                type: 'removableEdge',
                animated: false
              }}
              className="bg-[#0b0f17]"
            >
              <Background
                color="#1e293b"
                gap={24}
                size={1.5}
                variant={BackgroundVariant.Dots}
              />
              <Controls className="!bg-slate-900 !border-slate-800 !fill-slate-300 [&>button]:!border-slate-800 [&>button]:!bg-slate-900 [&>button]:!text-slate-300 hover:[&>button]:!bg-slate-800" />
              <MiniMap
                nodeColor={(n) => {
                  const data = n.data as NodeData | undefined;
                  if (data?.status === 'dead') return '#ef4444';
                  switch (data?.type) {
                    case 'client':
                      return '#38bdf8';
                    case 'load-balancer':
                      return '#22d3ee';
                    case 'app-server':
                      return '#34d399';
                    case 'redis-cache':
                      return '#c084fc';
                    case 'sql-database':
                      return '#fbbf24';
                    default:
                      return '#64748b';
                  }
                }}
                maskColor="rgba(11, 15, 23, 0.75)"
                className="!bg-slate-950 !border !border-slate-800 rounded-lg overflow-hidden shadow-2xl"
              />
              {/* 60 FPS Request Particle Overlay */}
              <ParticleOverlay />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        {/* Right Configuration & Chaos Panel */}
        <ConfigPanel />
      </div>

      {/* Live Execution Log Panel (above metrics bar) */}
      <LogPanel />

      {/* Live Process Terminal (streams worker logs in live mode) */}
      <TerminalPanel />

      {/* Bottom Metrics Bar */}
      <MetricsBar />
    </div>
  );
};

export default App;
