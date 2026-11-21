# SysFlow — Executive Master Plan & Phase Roadmap

> **Target Project:** SysFlow (Interactive Distributed System Design Simulator & Live Process Orchestrator)  
> **Author & Architect:** Manu S  
> **Date:** November 2026  
> **Status:** Phase 0 (Planning & Architecture Sign-Off)  
> **Repository Root:** `c:\Users\Manu.S\Desktop\System_design`  
> **Benchmark / Competitor Reference:** `https://designed-to-scale.vercel.app/` & `paperdraw.dev`

---

## 1. Executive Summary & Vision

### 1.1 The Market & The Opportunity
Existing system design tools fall into two limited categories:
1. **Static / Passive Visualizers (e.g., Designed-To-Scale, ByteByteGo):** Gorgeous animations and pre-rendered slides, but passive. The user watches a video or steps through fixed scenarios; the underlying system has no dynamic physics or rule-based emergence.
2. **Abstract Math Simulators (e.g., Paperdraw):** High-level approximations with sliders, where failure toggles simply turn a box grey and calculate an arithmetic formula.

### 1.2 Our Core Innovation: "The Dual-Engine Architecture"
SysFlow sets a new standard by combining **two unified execution planes**:

1. **Simulation Plane (Discrete Event Simulation in Web Worker):**
   - Pure mathematical, event-driven state-machine engine running off the main thread at 60 FPS.
   - Capable of simulating **10,000 to 100,000 requests/sec** with queuing theory (M/M/1, M/M/c), token-bucket rate limiting, LRU/LFU cache evictions, cascading timeouts, and thundering herd failures.
2. **Live Reality Plane (Real Process Cluster & Terminal Orchestrator):**
   - **This is the killer interview demo.** When the user drags an Application Server or Load Balancer node onto the canvas and switches to "Live Process Mode" (or opens Terminal View):
     - An actual Node.js/Go process or worker spawns on an assigned localhost port (e.g. `8001`).
     - An embedded multi-tab interactive terminal (`xterm.js`) attaches to that node, streaming live `stdout`/`stderr` logs.
     - A real reverse proxy load balancer binds to port `8000`.
     - The user (or an interview evaluator) can open their native operating system terminal and run:
       ```bash
       curl http://localhost:8000/api/data
       ```
     - **What happens:** The incoming TCP request is intercepted by the SysFlow Telemetry Bridge. On the visual canvas, a glowing packet visibly glides across the wire into the Load Balancer, gets dispatched to `Server-1`, `Server-1`'s live terminal logs the HTTP hit, and the response travels back!
     - When the user clicks **"Kill Node"**, a real `SIGTERM` kills the OS process; the terminal logs connection teardown, the canvas node triggers sparks and a broken state, and subsequent `curl` requests automatically failover to `Server-2` or return real `503 Service Unavailable`.

---

## 2. Competitive Differentiation Matrix

| Capability | Designed To Scale | Paperdraw | **SysFlow (Our System)** |
|---|---|---|---|
| **Visual Aesthetics** | Top-tier glowing animations, dark cyberpunk UI | Clean minimal UI | Top-tier glowing particles, custom bezier cables, node state shaders |
| **Simulation Nature** | Pre-scripted / Slide-based | Arithmetic approximations | Discrete Event Simulation (DES) with emergent behavior |
| **Real Process Execution** | ❌ None | ❌ None | ✅ **Real sub-processes (real ports, real HTTP sockets, real curl targets)** |
| **Integrated Terminal** | ❌ None | ❌ None | ✅ **Multi-tab xterm.js terminals for every running node** |
| **Distributed Tracing** | High level animation | ❌ None | ✅ **Click any packet dot -> full waterfall trace with span latencies** |
| **Failure Injection** | Preset buttons | Simple toggle | Rich Chaos Monkey: Kill, latency injection, packet loss, OOM leak, disk full |
| **Interview Showcase Factor** | Great visual learner | Conceptual toy | **Definitive proof of senior distributed systems engineering** |

---

## 3. Strict Verification & Anti-Hallucination Policy

To ensure complete transparency and zero fabricated claims:
1. **Status Tagging:** Every component, feature, and sub-phase is tracked in `IMPLEMENTATION_VERIFICATION_MATRIX.md` with one of four explicit states:
   - `[PLANNED]` — In specification; code not yet written.
   - `[IN_PROGRESS]` — Being coded; not yet verified end-to-end.
   - `[IMPLEMENTED]` — Code written and automated unit/integration tests passing.
   - `[VERIFIED]` — Tested live in the browser/CLI with reproducible verification steps documented for the user.
2. **Dual-Check Protocol:** For every deliverable:
   - Automated check: Vitest / Playwright / Node CLI test script.
   - User verification command: An exact terminal command (e.g. `npm test`, `curl -I http://localhost:...`) that the user can run independently to verify.
3. **Never Claim Passing Without Running:** No feature will be marked complete without executing the test harness and verifying output.

---

## 4. Phase-by-Phase Roadmap

```
  Phase 0: Architecture & Specs (Current)
     │
     ▼
  Phase 1: Foundation Canvas & Visual Particle Engine (Weeks 1-2)
     │
     ▼
  Phase 2: Discrete Event Simulation Engine (Web Worker) (Weeks 3-4)
     │
     ▼
  Phase 3: Live Process Cluster & Interactive Terminal Engine (Weeks 5-6)
     │
     ▼
  Phase 4: Advanced Components & Chaos Injection Suite (Weeks 7-8)
     │
     ▼
  Phase 5: Scenario Templates, Distributed Tracing & Polish (Weeks 9-10)
```

### Phase 1: Foundation Canvas & Visual Particle Engine
- **Goal:** Render a high-performance 60 FPS interactive canvas with drag-and-drop nodes, curved bezier cables, and glowing request particle animations matching `designed-to-scale.vercel.app`.
- **Key Deliverables:**
  1. Next.js 14+ / Vite + React 18 / TypeScript architecture with Tailwind CSS.
  2. Canvas library integration (React Flow / xyflow) with custom Node and Edge renderers.
  3. Canvas particle engine: WebGL / HTML5 Canvas overlay rendering smooth glowing packet dots along bezier trajectories.
  4. Core palette: Client/Traffic Generator, Load Balancer, Application Server, In-Memory Cache (Redis), SQL Database.
  5. UI state management with Zustand.
- **Verification:**
  - Automated: React component mount tests, node connection tests.
  - User verification: Drag 3 nodes onto canvas, connect them with edges, press Play, observe particles flowing smoothly at 60 FPS.

### Phase 2: Discrete Event Simulation Engine (Web Worker)
- **Goal:** Real rule-based state machines running in a dedicated Web Worker, generating authentic emergent behavior under traffic.
- **Key Deliverables:**
  1. DES Clock Manager, Priority Event Queue, and Component Registry in Web Worker.
  2. Component State Machines:
     - **Traffic Generator:** Constant, ramp, spike, diurnal traffic models.
     - **Load Balancer:** Round Robin, Least Connections, IP Hash.
     - **App Server:** Thread pool, CPU degradation curve, memory usage.
     - **Redis Cache:** LRU/LFU eviction, TTL expiry, cache hit/miss semantics.
     - **SQL Database:** Connection pool exhaustion, query queueing, latency degradation.
  3. Metrics Aggregator (P50/P95/P99 latency, RPS, Error rate, connection counts).
  4. 60 FPS state-sync bridge via `postMessage`.
- **Verification:**
  - Automated: Vitest suite verifying cache stampede, connection pool saturation, and load balancer distribution.
  - User verification: Set cache TTL = 2s under 500 RPS; watch hit-rate drop to 0% at expiration and database latency spike automatically.

### Phase 3: Live Process Cluster & Interactive Terminal Engine
- **Goal:** Physical execution plane where nodes correspond to real running operating system processes with live terminal input/output.
- **Key Deliverables:**
  1. Lightweight Node.js Process Supervisor Daemon (`sysflow-daemon`):
     - Manages child processes (`child_process.fork` / `spawn`).
     - Dynamic port assignment and port registry (`8000-8099`).
  2. WebSocket Bridge: Streams process logs and metrics bi-directionally between frontend and daemon.
  3. Embedded Terminal UI: `xterm.js` multi-tab panel in the bottom drawer.
     - Clicking any node highlights or switches to its active terminal session.
     - Node stdout/stderr rendered in real-time with syntax highlighting and timestamps.
  4. Real Reverse Proxy Load Balancer:
     - Real HTTP server routing actual requests to real spawned server processes.
  5. Live Traffic Injection:
     - Ability to send real HTTP requests via an in-app curl runner or native OS terminal.
- **Verification:**
  - Automated: Integration test spawning 2 HTTP servers and 1 proxy, verifying HTTP 200 responses balanced across both ports.
  - User verification: Run `curl http://localhost:8000/api/ping` in Windows PowerShell; see the request animated on canvas and logged in the xterm.js tab for Server 1.

### Phase 4: Advanced Components & Chaos Injection Suite
- **Goal:** Full component catalog and deep failure injection capabilities.
- **Key Deliverables:**
  1. Components: API Gateway (Rate Limiter token-bucket), Message Queue (FIFO + DLQ), CDN edge-caching, Auto-Scaler (metric-driven scale up/down), Circuit Breaker (Closed/Open/Half-Open).
  2. Chaos Suite:
     - Hard Kill (`SIGKILL` / worker drop).
     - Artificial Latency injection slider.
     - Packet loss / drop rate.
     - Memory leak simulation (OOM crash).
     - Network Partition (split brain).
- **Verification:**
  - Automated: Vitest test verifying Circuit Breaker trips after 5 consecutive 500 errors and fast-fails subsequent requests.
  - User verification: Enable Chaos Monkey on Server-2; watch Circuit Breaker turn Red and route 100% traffic to Server-1.

### Phase 5: Distributed Tracing, Templates, & Interview Playbook
- **Goal:** Turn SysFlow into the ultimate interview presentation tool.
- **Key Deliverables:**
  1. Distributed Tracing Waterfall View: Click any packet dot to open a Jaeger-style span view showing millisecond breakdown across gateway, cache, server, and DB.
  2. Pre-Built FAANG Scenario Templates:
     - "Design Twitter / X"
     - "Design URL Shortener (TinyURL)"
     - "Flash Sale / Ticketmaster Thundering Herd"
     - "Microservices Cascade Failure"
  3. Recording & Export: PNG, SVG, and JSON architecture export.
  4. Interview Playbook document with guided scripts.
- **Verification:**
  - Automated: E2E Playwright tests verifying template loading and trace drawer rendering.
  - User verification: Load "Flash Sale" template, click Play, trigger failure, open Trace Drawer, inspect span breakdowns.

---

## 5. Technology Stack Architecture

| Layer | Technologies Selected | Justification |
|---|---|---|
| **Frontend Framework** | Next.js 14+ (App Router) + React 18 + TypeScript | Industry standard, server/client separation, fast HMR |
| **Canvas & Graph** | React Flow (`@xyflow/react`) | Best-in-class node-edge graph canvas, extensible nodes |
| **Animation Engine** | Custom Canvas Overlay + Framer Motion | 60 FPS particle rendering without DOM thrashing |
| **Simulation Runtime** | Dedicated Web Worker + TypeScript | Offloads simulation physics; zero UI lag |
| **Terminal Emulator** | `xterm.js` + `xterm-addon-fit` + `xterm-addon-web-links` | Authentic terminal look and feel with ANSI colors |
| **Local Daemon / IPC** | Node.js child_process + `ws` (WebSockets) | Spawns real HTTP servers, proxies, and streams stdio |
| **Styling & Icons** | Tailwind CSS + Lucide React + Radix UI | Modern dark theme cyberpunk aesthetic matching designed-to-scale |
| **State Management** | Zustand (with transient subscriptions) | High-frequency metric updates without React re-render cascades |
| **Testing** | Vitest + Playwright | Unit, integration, and E2E coverage |

---

## 6. Immediate Next Steps

1. Review and approve the **Production Architecture Spec** (`PRODUCTION_ARCHITECTURE_SPEC.md`).
2. Review the initial **Implementation Verification Matrix** (`IMPLEMENTATION_VERIFICATION_MATRIX.md`).
3. Initialize the codebase workspace with the clean modular structure and launch Phase 1 implementation.
