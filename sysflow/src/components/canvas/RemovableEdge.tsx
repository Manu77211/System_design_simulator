import React from 'react';
import {
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps
} from '@xyflow/react';
import { Trash2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';

export const RemovableEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected
}) => {
  const { deleteEdge } = useCanvasStore();

  // Single bidirectional wire (request forward, response return)
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY
  });

  return (
    <>
      {/* Single wire */}
      <path
        d={path}
        fill="none"
        stroke={selected ? '#38bdf8' : '#334155'}
        strokeWidth={selected ? 2.5 : 1.8}
        strokeDasharray="4 3"
        className="transition-colors duration-200"
      />

      {/* Interactive Labels & Delete Button */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center gap-1.5"
        >
          <div className="flex flex-col items-center gap-0.5 text-[8px] font-mono text-slate-500 bg-slate-950/80 px-1 py-0.5 rounded border border-slate-800/80 pointer-events-none select-none">
            <span className="flex items-center gap-0.5 text-sky-400">
              REQ <ArrowRight className="w-2 h-2" />
            </span>
            <span className="flex items-center gap-0.5 text-emerald-400">
              <ArrowLeft className="w-2 h-2" /> RES
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteEdge(id);
            }}
            className={`group/btn w-5 h-5 rounded-full bg-slate-900 border transition-all duration-200 flex items-center justify-center shadow-lg cursor-pointer ${
              selected
                ? 'border-rose-500 bg-slate-950 text-rose-400 opacity-100 scale-110 shadow-rose-950/50'
                : 'border-slate-800 text-slate-500 opacity-0 hover:opacity-100 hover:border-rose-500 hover:text-rose-400 hover:bg-slate-950'
            }`}
            title="Delete Connection"
          >
            <Trash2 className="w-2.5 h-2.5 group-hover/btn:scale-110 transition-transform" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
