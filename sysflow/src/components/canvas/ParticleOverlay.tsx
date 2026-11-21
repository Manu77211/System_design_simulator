import React, { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '../../store/canvasStore';

export const ParticleOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { getViewport, getNode } = useReactFlow();
  const { isPlaying, stepSimulation, simulationSpeed } = useCanvasStore();

  useEffect(() => {
    let animId: number;
    let lastTick = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Throttle simulation ticks: target ~60fps base, speed-adjusted
      const tickMs = Math.max(10, 18 / simulationSpeed);
      if (isPlaying && now - lastTick >= tickMs) {
        lastTick = now;
        stepSimulation();
      }

      const viewport = getViewport();
      ctx.save();
      ctx.translate(viewport.x, viewport.y);
      ctx.scale(viewport.zoom, viewport.zoom);

      const particles = useCanvasStore.getState().particles;
      const edges = useCanvasStore.getState().edges;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const edge = edges.find((e) => e.id === p.edgeId);
        if (!edge) continue;

        const srcNode = getNode(edge.source);
        const tgtNode = getNode(edge.target);
        if (!srcNode || !tgtNode) continue;

        const sw = srcNode.measured?.width || 220;
        const sh = srcNode.measured?.height || 95;
        const th = tgtNode.measured?.height || 95;

        // Single bidirectional wire — forward travels source→target,
        // return travels target→source (handled by reversed t below).
        const p0x = srcNode.position.x + sw;
        const p0y = srcNode.position.y + sh / 2;
        const p3x = tgtNode.position.x;
        const p3y = tgtNode.position.y + th / 2;

        const dx = Math.abs(p3x - p0x) * 0.55;
        const p1x = p0x + dx, p1y = p0y;
        const p2x = p3x - dx, p2y = p3y;

        // Forward: 0→1 along source→target; Return: 1→0 (reversed)
        const t = p.direction === 'forward'
          ? Math.min(1, Math.max(0, p.progress))
          : Math.min(1, Math.max(0, 1 - p.progress));

        const t1 = 1 - t;
        const x = t1*t1*t1*p0x + 3*t1*t1*t*p1x + 3*t1*t*t*p2x + t*t*t*p3x;
        const y = t1*t1*t1*p0y + 3*t1*t1*t*p1y + 3*t1*t*t*p2y + t*t*t*p3y;

        // Glow aura
        const halo = ctx.createRadialGradient(x, y, 1, x, y, 10);
        halo.addColorStop(0, p.color);
        halo.addColorStop(0.35, p.color + 'aa');
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        // Brilliant core dot
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [getViewport, getNode, isPlaying, stepSimulation, simulationSpeed]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />;
};
