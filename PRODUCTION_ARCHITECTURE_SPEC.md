# SysFlow — Production Architecture Specification

> **Document Version:** 1.0.0  
> **Target System:** SysFlow Distributed System Simulator & Process Orchestrator  
> **Date:** November 2026  
> **Author:** Manu S  
> **Status:** Approved for Implementation

---

## 1. System Architecture Overview

SysFlow operates across three synchronized tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT / FRONTEND                               │
│                                                                             │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │   React Flow Graph      │  │      Particle Canvas Overlay             │  │
│  │   (Custom Nodes/Ports)  │  │      (60 FPS Request Animation)          │  │
│  └──────────┬──────────────┘  └────────────────────▲─────────────────────┘  │
│             │                                      │                         │
│             ▼                                      │                         │
│  ┌─────────────────────────┐                       │                         │
│  │   Zustand Store Engine  ├───────────────────────┤                         │
│  │   (Transient Updates)   │                       │                         │
│  └──────────┬──────────────┘                       │                         │
│             │                                      │                         │
│  ┌──────────▼──────────────┐  ┌────────────────────▼─────────────────────┐  │
│  │   xterm.js Multi-Tab    │  │      Real-Time Metrics & Trace Drawer    │  │
│  │   Terminal Panel        │  │      (P99, RPS, Error Rates, Spans)      │  │
│  └──────────┬──────────────┘  └──────────────────────────────────────────┘  │
└─────────────┼──────────────────────────────────────┬────────────────────────┘
              │ postMessage                          │ WebSocket (ws://)
              ▼                                      ▼
┌─────────────────────────────┐  ┌────────────────────────────────────────────┐
│      WEB WORKER TIER        │  │          SUPERVISOR DAEMON TIER            │
│  (Simulation Engine)        │  │          (Live Reality Plane)              │
│                             │  │                                            │
│  ┌───────────────────────┐  │  │  ┌──────────────────────────────────────┐  │
│  │ Discrete Event Sim    │  │  │  │ Process Manager                      │  │
│  │ (Virtual Clock / DES) │  │  │  │ (child_process fork/spawn)           │  │
│  └──────────┬────────────┘  │  │  └──────────────────┬───────────────────┘  │
│             ▼               │  │                     ▼                      │
│  ┌───────────────────────┐  │  │  ┌──────────────────────────────────────┐  │
│  │ Component State       │  │  │  │ Live Reverse Proxy (Node/Express)    │  │
│  │ Machines (Rules)      │  │  │  │ (Port 8000 -> 8001, 8002...)         │  │
│  └──────────┬────────────┘  │  │  └──────────────────┬───────────────────┘  │
│             ▼               │  │                     ▼                      │
│  ┌───────────────────────┐  │  │  ┌──────────────────────────────────────┐  │
│  │ Metrics Collector &   │  │  │  │ Terminal stdio PTY Bridge            │  │
│  │ Trace Generator       │  │  │  │ (Stream stdout/stderr to xterm.js)   │  │
│  └───────────────────────┘  │  │  └──────────────────────────────────────┘  │
└─────────────────────────────┘  └────────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### 2.1 The Visual & Animation Engine
To match and exceed the visual fidelity of `designed-to-scale.vercel.app`:
- **Nodes:** Designed with Tailwind CSS and CSS backdrop-blur, subtle neon borders, real-time mini-sparklines, and state indicators (Pulsing Green for Healthy, Amber for High CPU, Vibrating Red for Overloaded, Dark Grayscale + Cracked styling for Dead).
- **Wires (Edges):** Interactive SVG bezier curves with customizable routing (smoothStep or cubic bezier).
- **Packet Particle Renderer:** An HTML5 Canvas layer positioned directly over the React Flow canvas, synchronized with the camera viewport (pan/zoom transformation matrix).
  - Each particle has: `id`, `edgeId`, `progress` (0.0 to 1.0), `speed`, `color` (Green = 2xx, Amber = slow/retry, Red = 5xx/drop), `glowSize`, and `payloadSnapshot`.
  - Particles are rendered using double-buffered Canvas 2D / WebGL rendering, handling up to 5,000 concurrent particles at steady 60 FPS without DOM thrashing.

### 2.2 The Discrete Event Simulation (DES) Engine
Runs inside an isolated Web Worker (`src/simulation/worker.ts`):
- **Virtual Clock (`ClockManager`):** Decoupled from wall-clock time. Supports variable speeds (0.5x, 1x, 5x, 10x, 100x) and instantaneous step-by-step debug stepping.
- **Priority Event Queue:** Binary min-heap ordered by `scheduledTimestamp`.
- **Component State Machines:** Every architectural element executes deterministic rule sets.
  - *Load Balancer:* Manages healthy instance pool, active socket counts, and distributes load based on Round Robin, Weighted, or Least Connections.
  - *In-Memory Cache (Redis):* Key eviction under memory pressure, TTL countdown, cache stampede propagation to downstream storage.
  - *SQL Database:* Connection pool locking, queue buildup, non-linear latency degradation under CPU saturation.
- **Trace Context Emission:** Every synthetic request carries a `TraceContext` (`traceId`, `spanId`, `parentSpanId`, `timestamps`). When completed, the full trace tree is delivered to the UI.

### 2.3 The Live Reality Plane (Process Supervisor & Terminal Bridge)
This subsystem powers the "Actual Visualization / Terminal Execution" mode:
- **Daemon Architecture (`server/supervisor.ts`):**
  - A lightweight local Node.js daemon running on port `4000`.
  - Exposes WebSocket endpoints for real-time IPC with the frontend:
    - `/ws/terminal/:nodeId` — Bidirectional terminal stream (ANSI input/output).
    - `/ws/telemetry` — Live request interceptor events.
- **Process Spawning:**
  - When the user creates a Server node with "Live Execution" enabled:
    1. The supervisor allocates a free port in range `8001..8099`.
    2. It forks a lightweight runtime worker script (`server/workers/http-server.ts`).
    3. The worker's `process.stdout` and `process.stderr` pipes are piped directly to the WebSocket terminal channel.
- **Live Reverse Proxy:**
  - A built-in HTTP proxy listens on port `8000`.
  - Reads the graph topology: if a Load Balancer node connects `Client -> LB -> Server-1, Server-2`, the proxy dynamically configures its routing table.
  - When a real HTTP request hits `http://localhost:8000`:
    1. The proxy intercepts the request headers.
    2. Emits a WebSocket telemetry event to the frontend: `REQUEST_RECEIVED { from: 'client', to: 'lb-1', path: '/api' }`.
    3. The frontend spawns a glowing particle on the canvas wire.
    4. The proxy forwards the TCP socket to the chosen server (e.g. `localhost:8001`).
    5. When the server responds, a return telemetry event is emitted; the particle flows back.
- **Kill Node Integration:**
  - Clicking "Kill Node" sends a WebSocket command `KILL_PROCESS { nodeId }`.
  - The supervisor sends `process.kill(pid, 'SIGTERM')`.
  - The process exits, logs "Shutdown complete" to its terminal, and subsequent requests to that node fail with `ECONNREFUSED` or are re-routed to surviving nodes!

---

## 3. Data Contracts & Event Schemas

### 3.1 Component Definition Schema
```typescript
export interface SystemComponent {
  id: string;
  name: string;
  type: ComponentType;
  position: { x: number; y: number };
  config: Record<string, any>;
  state: {
    status: 'healthy' | 'degraded' | 'overloaded' | 'dead';
    cpuUsage: number;        // 0.0 - 100.0%
    memoryUsage: number;     // in MB
    activeConnections: number;
    queueDepth: number;
    errorRate: number;       // 0.0 - 1.0
  };
  liveProcess?: {
    pid: number;
    port: number;
    status: 'running' | 'stopped';
  };
}
```

### 3.2 Telemetry Packet Schema (Worker & Live Daemon to UI)
```typescript
export interface RequestPacket {
  id: string;
  traceId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeId: string;
  status: 'pending' | 'success' | 'error' | 'dropped';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  latencyMs: number;
  statusCode?: number;
  timestamp: number;
}
```

### 3.3 Distributed Trace Span Schema
```typescript
export interface TraceSpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  nodeId: string;
  operationName: string;
  startTime: number;
  durationMs: number;
  status: 'ok' | 'error';
  tags: Record<string, string | number>;
}
```

---

## 4. UI / Visual Layout Architecture

The application layout is structured as a professional, developer-focused studio:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Top Bar: Brand, Simulation Controls (▶ ⏸ 1x-100x), Mode (Sim / Live), Export │
├────────────┬─────────────────────────────────────────────────┬──────────────┤
│            │                                                 │              │
│ Left Panel │             Main Visual Canvas                  │ Right Panel  │
│ Component  │   - React Flow Node Graph                       │ Config Panel │
│ Palette    │   - 60 FPS Particle Canvas Overlay              │ & Live State │
│            │   - Bezier Connecting Wires                     │ Inspector    │
│ - Clients  │   - Real-time Node Health Glows                 │              │
│ - LB / GW  │   - Drag, Drop, Connect, Delete                 │ - Settings   │
│ - Servers  │                                                 │ - Live gauges│
│ - Caches   │                                                 │ - Chaos test │
│ - DBs      │                                                 │              │
│ - Queues   │                                                 │              │
│            │                                                 │              │
├────────────┴─────────────────────────────────────────────────┴──────────────┤
│ Bottom Drawer (Collapsible):                                                │
│ [📊 Real-Time Metrics Dashboard] | [🔎 Distributed Tracing] | [💻 Live Terminals] │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Security & Isolation Model

- The Live Process Supervisor runs exclusively on localhost (`127.0.0.1`).
- Port allocations are restricted to an isolated range (`8000..8099`).
- Worker processes run with restricted privilege (no root, standard Node unprivileged child processes).
- Terminal sessions run pseudo-terminals or direct stdio pipes without executing raw arbitrary shell scripts outside pre-defined worker harnesses.
