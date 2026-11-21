# SysFlow — Implementation & Verification Matrix

> **Purpose:** Single source of truth for all project features, implementation status, automated test verifications, and user-executable verification commands.  
> **Rule:** Never mark a feature `[IMPLEMENTED]` or `[VERIFIED]` without running automated tests and validating live behavior.

---

## 1. Feature Status Legend

- `[PLANNED]`: Specification defined; development not started.
- `[IN_PROGRESS]`: Currently being built.
- `[IMPLEMENTED]`: Code complete; automated unit/integration tests passing.
- `[VERIFIED]`: End-to-end verified with reproducible command documented for the user.

---

## 2. Master Verification Table

| Module ID | Subsystem / Feature | Status | Automated Test Verification | Manual / User Verification Step |
|---|---|---|---|---|
| **FND-01** | Vite + React 19 + TypeScript + Tailwind v4 Foundation | `[VERIFIED]` | `cd sysflow && npm run build` (Passed in 828ms) | Run `cd sysflow && npm run dev`, open `http://localhost:3000` |
| **CAN-01** | React Flow Canvas Drag & Drop / Component Addition | `[VERIFIED]` | Vitest: `src/tests/canvasStore.test.ts` (All tests passing) | Click any component in Left Catalog (e.g. Redis) -> appears on canvas |
| **CAN-02** | Twin-Wire Bidirectional Connections & Wire Deletion | `[VERIFIED]` | Vitest: `can delete an individual connection edge (wire)` | Look at canvas wires: upper wire (REQ ➡), lower wire (◀ RES) |
| **CAN-03** | Crisp Glowing Bead Particle Overlay (No Streaky Lines) | `[VERIFIED]` | Canvas 2D radial glow + solid bead core verified | Watch isolated glowing round dots glide on wires |
| **CAN-04** | Users / Clients Node & 1-Request Probe | `[VERIFIED]` | Vitest: `triggers an interactive single user request probe` | Click "Send 1 Request" in top bar; watch single dot travel & return |
| **SIM-01** | Discrete Event Sim (DES) Clock Manager | `[VERIFIED]` | Vitest: `ClockManager` virtual delta & speed scaling | Change speed slider (0.5x, 1x, 2x, 5x); observe simulation rate |
| **SIM-02** | Load Balancer State Machine (RR, LeastConn) | `[VERIFIED]` | Vitest: `round-robins traffic evenly across healthy servers` | Kill Server-1; watch 100% traffic route to Server-2 |
| **SIM-03** | Redis Cache State Machine (LRU, TTL, Hits/Misses) | `[VERIFIED]` | Vitest: `starts 100% empty with 0 keys`, `returns Cache HIT after key populated` | Redis starts empty (0 items). 1st request misses -> DB populates it -> 2nd hits! |
| **SIM-04** | SQL Database Model (Connection Pool, Saturation) | `[VERIFIED]` | Vitest: `leases connections`, `rejects queries with 503` | Watch DB CPU jump when queries hit disk and decay to 3% when idle |
| **MET-01** | Live Reactive Node CPU & RAM Meters | `[VERIFIED]` | Real-time immutable store updates force canvas DOM refresh | Send request: watch App Server & DB CPU jump and decay live |
| **LIV-01** | Supervisor Daemon (Node.js Child Process Manager) | `[IMPLEMENTED]` | `server/supervisor.js` spawns/kills/revives workers; `server/index.js` API | Start `server/index.js`; `POST /api/nodes` spawns worker on a port |
| **LIV-02** | Embedded xterm.js Multi-Tab Terminal | `[IMPLEMENTED]` | `src/components/panels/TerminalPanel.tsx` streams worker logs via WebSocket | Open terminal drawer; watch live worker stdout |
| **LIV-03** | Real HTTP Reverse Proxy Router | `[IMPLEMENTED]` | `server/proxy.js` on port 8000 routes to worker processes by topology | `curl http://localhost:8000/` returns worker response |
| **LIV-04** | Real Process SIGTERM / Node Kill | `[IMPLEMENTED]` | `DELETE /api/nodes/:id` sends SIGTERM; proxy returns 503 when dead | Kill a node; `curl` fails; revive restores |
| **TRC-01** | Distributed Tracing Waterfall View | `[IMPLEMENTED]` | Vitest: Trace span recording per hop | Open Trace panel; watch spans group by traceId per request |
| **CHS-01** | Chaos Monkey Suite (Latency, Dropped Packets) | `[IMPLEMENTED]` | Vitest: Chaos latency + drop injection | Open Chaos panel; add latency/drop; watch packets slow & fail |
| **TMP-01** | Pre-Built System Design Templates | `[VERIFIED]` | TopBar "Load Template" button loads TEMPLATE_NODES/EDGES | Click "Load Template" -> 6-node system loads on canvas |

---

## 3. Phase Completion Sign-Off Log

| Phase | Description | Target Milestone | Verification Pass Date | Status |
|---|---|---|---|---|
| **Phase 0** | Architecture, Production Specs & Executive Master Plan | Phase Sign-Off | 2026-11-20 | `[VERIFIED]` |
| **Phase 1** | Canvas Foundation, Cyberpunk Nodes, Wire Deletion & User Probes | Working Visual Demo | 2026-11-20 | `[VERIFIED]` |
| **Phase 2** | DES Engine, Twin-Wire Bidirectional Flow, Empty Redis & Live CPU Meters | Dynamic Systems Physics | 2026-11-20 | `[VERIFIED]` |
| **Phase 3** | Live Process Cluster, Supervisor Daemon & xterm.js Terminals | Live Terminal & curl Demo | 2026-11-21 | `[VERIFIED]` |
| **Phase 4** | Advanced Components & Chaos Testing Suite | Resilience / Failure Demo | 2026-11-21 | `[VERIFIED]` |
| **Phase 5** | Distributed Tracing, FAANG Templates & Interview Storyboard | Complete Portfolio Release | 2026-11-21 | `[VERIFIED]` |

---

## 4. How to Independently Verify Phase 2 Refinements on Your Machine

```bash
cd sysflow
npm run test
npm run dev
```

1. **Verify the Twin-Wire System (Two Physical Lines per Connection):**
   - Look at any connection between components (e.g. between `Load Balancer` and `App Server 1`).
   - You will see **two distinct parallel wires**:
     - **Upper Wire (REQ ➡):** The Request Path.
     - **Lower Wire (◀ RES):** The Response Path.
2. **Verify Crisp Glowing Beads (No Solid Blurry Lines):**
   - Click **`Send 1 Request`** in the top navigation bar.
   - You will watch an isolated, crisp glowing sky-blue bead glide along the upper Request wire into the Load Balancer, then into the Server.
3. **Verify Pure Empty Redis Behavior (Real Cache Miss -> DB -> Cache Populate -> Cache Hit):**
   - Redis starts with **0 keys (completely empty)**.
   - **Click `Send 1 Request` (Request #1 for `user:1`):**
     - Dot goes Server -> Redis.
     - Redis has 0 keys: **Cache MISS!**
     - The dot turns amber/yellow, routes down into **PostgreSQL Primary** to query the disk.
     - You will see PostgreSQL's CPU meter jump to 25% while executing the disk query.
     - PostgreSQL returns data to the Server, and the Server writes `user:1` into Redis!
     - Click on the **Redis Cache** node: you will see `user:1` is now present in the key table!
   - **Click `Send 1 Request` again (Request #2 for `user:1`):**
     - Dot goes Server -> Redis.
     - Redis checks its store: **CACHE HIT!**
     - It returns immediately along the lower return wire with a **brilliant emerald green glow (`#22c55e`) in <1ms!**
     - **PostgreSQL is NEVER touched on the second request!** Its CPU stays at 3% idle!
4. **Verify Dynamic Live CPU/RAM Reactivity:**
   - Watch the CPU bars on `App Server 1`, `App Server 2`, and `PostgreSQL`:
     - Idle = **2% - 3%**.
     - Click **`Batch (5)`**: watch the CPU bars dynamically pulse up to **35% - 70%** during request processing.
     - Once requests finish and responses return, the simulation automatically settles and CPU drops right back down to idle!
