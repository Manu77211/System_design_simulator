import React from 'react';
import {
  Users,
  GitFork,
  Server,
  Zap,
  Database,
  Mail,
  Shield,
  Layers,
  Plus
} from 'lucide-react';
import { ComponentType } from '../../types';
import { useCanvasStore } from '../../store/canvasStore';

interface PaletteItem {
  type: ComponentType;
  title: string;
  category: string;
  icon: React.ReactNode;
  description: string;
}

const paletteItems: PaletteItem[] = [
  {
    type: 'client',
    title: 'Users / Clients',
    category: 'Ingress',
    icon: <Users className="w-4 h-4 text-sky-400" />,
    description: 'Generates client traffic: 1 single user probe or up to 1M concurrent requests (GET / POST)'
  },
  {
    type: 'load-balancer',
    title: 'Load Balancer',
    category: 'Networking',
    icon: <GitFork className="w-4 h-4 text-cyan-400" />,
    description: 'Distributes traffic via Round Robin or Least Connections'
  },
  {
    type: 'app-server',
    title: 'App Server',
    category: 'Compute',
    icon: <Server className="w-4 h-4 text-emerald-400" />,
    description: 'Stateless compute worker with CPU & connection pool modeling'
  },
  {
    type: 'redis-cache',
    title: 'Redis Cache',
    category: 'Storage',
    icon: <Zap className="w-4 h-4 text-purple-400" />,
    description: 'Sub-millisecond key-value store with LRU eviction and TTL'
  },
  {
    type: 'sql-database',
    title: 'PostgreSQL DB',
    category: 'Storage',
    icon: <Database className="w-4 h-4 text-amber-400" />,
    description: 'ACID relational database with connection pool limits'
  },
  {
    type: 'message-queue',
    title: 'Message Queue',
    category: 'Async',
    icon: <Mail className="w-4 h-4 text-rose-400" />,
    description: 'FIFO buffer with dead-letter queue and backpressure'
  },
  {
    type: 'api-gateway',
    title: 'API Gateway',
    category: 'Networking',
    icon: <Shield className="w-4 h-4 text-indigo-400" />,
    description: 'Authentication, token-bucket rate limiter, and path routing'
  },
  {
    type: 'cdn',
    title: 'CDN Edge',
    category: 'Ingress',
    icon: <Layers className="w-4 h-4 text-blue-400" />,
    description: 'Edge cache serving static assets closer to users'
  }
];

export const ComponentPalette: React.FC = () => {
  const { addNode } = useCanvasStore();

  const handleAdd = (type: ComponentType) => {
    // Add near center of canvas with slight random offset
    const x = 400 + (Math.random() * 80 - 40);
    const y = 200 + (Math.random() * 80 - 40);
    addNode(type, { x, y });
  };

  return (
    <div className="w-64 bg-slate-900/95 border-r border-slate-800/80 p-4 flex flex-col h-full z-20 backdrop-blur-md">
      <div className="mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
          Component Catalog
        </h2>
        <p className="text-[11px] text-slate-500">
          Click to add components to the canvas
        </p>
      </div>

      <div className="space-y-2 overflow-y-auto pr-1 flex-1">
        {paletteItems.map((item) => (
          <button
            key={item.type}
            onClick={() => handleAdd(item.type)}
            className="w-full text-left p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 transition-all duration-150 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-slate-900 border border-slate-700/60 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition-colors">
                    {item.title}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {item.category}
                  </div>
                </div>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 group-hover:rotate-90 transition-all" />
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
