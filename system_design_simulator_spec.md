# System Design Simulator — Complete Product Specification

> **Project Name:** SysFlow (working title)
> **Author:** Manu S
> **Date:** October 2026
> **Status:** Planning Phase
> **Type:** Interactive Web Application — Portfolio Project + Potential SaaS

---

## Table of Contents

1. [Vision & Problem Statement](#1-vision--problem-statement)
2. [How It Differs from Paperdraw](#2-how-it-differs-from-paperdraw)
3. [Complete Component Catalog](#3-complete-component-catalog)
4. [Component Behavioral Models (Rules & State)](#4-component-behavioral-models)
5. [Simulation Engine Architecture](#5-simulation-engine-architecture)
6. [Visual Design System](#6-visual-design-system)
7. [User Interactions & Features](#7-user-interactions--features)
8. [Tech Stack & Architecture](#8-tech-stack--architecture)
9. [MVP Phasing & Roadmap](#9-mvp-phasing--roadmap)
10. [Monetization Strategy](#10-monetization-strategy)
11. [Competitive Differentiation](#11-competitive-differentiation)

---

## 1. Vision & Problem Statement

### The Problem
Developers studying system design rely on static diagrams, YouTube videos, and blog posts. They **read** about cache invalidation, load balancer algorithms, and cascade failures — but never **see** or **feel** them happen. Understanding comes from interaction, not observation.

### The Vision
An interactive canvas where developers drag-drop real system components, wire them together, throw traffic at them, intentionally break things — and **watch the system's behavior emerge from the rules**, not from hardcoded animations. Every component has internal state, follows real behavioral rules, and interacts with other components naturally.

### Target Users
- Developers preparing for system design interviews (FAANG, startups)
- Junior/mid developers learning distributed systems concepts
- Engineering educators and bootcamp instructors
- Tech leads prototyping architecture before implementation

### Core Philosophy
> "Define the rules. Let the behavior emerge."

We don't hardcode outcomes. Each component is a state machine. When you wire them together and throw traffic, **real behaviors emerge** — cache warming, cascade failures, hot partitions, thundering herds — all naturally.

---

## 2. How It Differs from Paperdraw

| Aspect | Paperdraw | SysFlow |
|--------|-----------|---------|
| Simulation | Deterministic math approximations | Rule-based emergent behavior |
| Numbers | Pre-calculated outputs | Emerge from actual state machines |
| Failure modes | Toggle switches | Kill nodes, inject latency, corrupt data — cascades happen naturally |
| Learning | "Here's the answer" | "Discover the answer by experimenting" |
| Components | High-level blocks | Configurable state machines with real internal behavior |
| Replayability | Same input = same output | Same input can produce different outcomes depending on timing |
| Open source | Yes (reference, not competition) | Yes (core) + Premium features |
| Traffic patterns | Simple sliders | Realistic patterns — bursts, gradual ramp, spike, diurnal |

### Key Differentiator
Paperdraw tells you "this is what happens." SysFlow lets you **discover** what happens. The failure modes, the bottlenecks, the cascade effects — they're not scripted. They emerge from the simulation.

---

## 3. Complete Component Catalog

### 3.1 Traffic Sources (Client Layer)

| Component | Icon | Description |
|-----------|------|-------------|
| **Web Client** | 🌐 | Browser-based user generating HTTP requests |
| **Mobile Client** | 📱 | Mobile app client with different latency characteristics |
| **API Client** | 🔌 | Machine-to-machine API consumer (webhooks, integrations) |
| **Traffic Generator** | 🚦 | Configurable synthetic traffic source — set RPS, patterns, payload size |
| **WebSocket Client** | 🔗 | Persistent connection client for real-time features |

**Traffic Patterns Available:**
- Constant (steady N req/sec)
- Linear Ramp (gradual increase)
- Spike (sudden burst, e.g., flash sale)
- Diurnal (day/night cycle — realistic)
- Random burst (unpredictable spikes)
- Custom curve (draw your own traffic shape)

---

### 3.2 Entry Points & Networking

| Component | Icon | Description |
|-----------|------|-------------|
| **DNS** | 🌍 | Domain name resolution with TTL, geo-routing |
| **CDN** | 🗺️ | Content delivery network — edge caching, cache TTL, origin pull |
| **API Gateway** | 🚪 | Request routing, authentication check, rate limiting, request transformation |
| **Load Balancer (L4)** | ⚖️ | Transport-layer balancing (TCP/UDP level) |
| **Load Balancer (L7)** | ⚖️ | Application-layer balancing (HTTP level, path-based routing) |
| **Reverse Proxy** | 🔄 | Request forwarding, SSL termination, compression |
| **Firewall / WAF** | 🛡️ | Web Application Firewall — block malicious traffic, IP filtering |

---

### 3.3 Application Layer

| Component | Icon | Description |
|-----------|------|-------------|
| **Web Server** | 🖥️ | Serves static content, forwards dynamic requests |
| **Application Server** | ⚙️ | Business logic processing, stateless |
| **Microservice** | 📦 | Independent service with own data store and API |
| **Serverless Function** | λ | Cold start + execution time, auto-scaling, per-invocation cost |
| **Background Worker** | 🔧 | Processes jobs from queues asynchronously |
| **Cron Job / Scheduler** | ⏰ | Periodic task execution |
| **WebSocket Server** | 📡 | Handles persistent connections for real-time communication |

---

### 3.4 Caching Layer

| Component | Icon | Description |
|-----------|------|-------------|
| **In-Memory Cache (Redis)** | ⚡ | Key-value store with TTL, LRU/LFU eviction, max memory |
| **Distributed Cache** | ⚡⚡ | Multi-node cache with consistent hashing, replication |
| **CDN Cache** | 🗺️ | Edge-level caching (configured via CDN component) |
| **Application Cache** | 💾 | In-process cache (local to each app server instance) |
| **Write-Through Cache** | ⚡→🗄️ | Cache that writes to DB synchronously on updates |
| **Write-Behind Cache** | ⚡⟿🗄️ | Cache that batches and writes to DB asynchronously |

---

### 3.5 Database Layer

| Component | Icon | Description |
|-----------|------|-------------|
| **SQL Database (Primary)** | 🗄️ | Relational DB — ACID transactions, connection pool, query queue |
| **SQL Read Replica** | 🗄️📖 | Read-only copy of primary, replication lag |
| **NoSQL Document DB** | 📄 | Schemaless, horizontal scaling, eventual consistency option |
| **Key-Value Store** | 🔑 | Simple get/set, ultra-fast, limited query capability |
| **Wide-Column Store** | 📊 | Cassandra-like — distributed, partition-key based, tunable consistency |
| **Graph Database** | 🕸️ | Relationship-heavy queries, traversals |
| **Time-Series DB** | 📈 | Optimized for time-ordered data (metrics, IoT, logs) |
| **Search Engine** | 🔍 | Full-text search, inverted index (Elasticsearch-like) |
| **Vector Database** | 🧠 | Similarity search, embeddings, ANN indexing |

**Database Configurations:**
- Connection pool size
- Max connections
- Replication mode (sync / async)
- Replication lag (configurable)
- Sharding strategy (hash / range / geo)
- Number of shards
- Read/Write split ratio
- Transaction isolation level

---

### 3.6 Message & Event Systems

| Component | Icon | Description |
|-----------|------|-------------|
| **Message Queue** | 📬 | FIFO queue — producer/consumer, at-least-once delivery |
| **Event Stream (Kafka-like)** | 🌊 | Partitioned log, consumer groups, replay capability, retention |
| **Pub/Sub** | 📢 | Publish-subscribe pattern, fan-out to multiple subscribers |
| **Dead Letter Queue** | ☠️📬 | Failed messages land here after max retries |
| **Task Queue** | 📋 | Priority-based job queue for background workers |

**Message Queue Configurations:**
- Max queue depth
- Message TTL
- Delivery guarantee (at-most-once, at-least-once, exactly-once)
- Number of partitions (for Kafka)
- Consumer group count
- Retry policy (max retries, backoff)
- Batch size

---

### 3.7 Storage

| Component | Icon | Description |
|-----------|------|-------------|
| **Object Storage (S3-like)** | 🪣 | Blob storage — images, files, backups. High durability |
| **File System** | 📁 | Mounted disk storage, limited IOPS |
| **Block Storage** | 💿 | Low-level disk — attached to compute instances |

---

### 3.8 Security & Authentication

| Component | Icon | Description |
|-----------|------|-------------|
| **Auth Service** | 🔐 | Authentication — validates tokens/credentials |
| **OAuth Provider** | 🎫 | Issues JWT/OAuth tokens, manages sessions |
| **Rate Limiter** | 🚧 | Token bucket / sliding window — blocks excess traffic |
| **Encryption Service** | 🔒 | Encrypts/decrypts data in transit or at rest |
| **Secret Manager** | 🗝️ | Stores and rotates API keys, passwords, certificates |
| **IP Whitelist/Blacklist** | 📋 | Allow/deny based on source IP |

---

### 3.9 Observability & Monitoring

| Component | Icon | Description |
|-----------|------|-------------|
| **Logging Service** | 📝 | Aggregates logs from all components (simulated log stream) |
| **Metrics Collector** | 📊 | Scrapes metrics (CPU, memory, latency, error rate) |
| **Alerting System** | 🚨 | Triggers alerts when thresholds breached |
| **Distributed Tracing** | 🔎 | Traces request path across all components (visual trace view) |
| **Health Check** | 💓 | Periodic health pings to components, marks unhealthy |

---

### 3.10 Resilience Patterns (Middleware / Decorators)

These aren't standalone nodes — they **attach to connections or components** as behaviors.

| Pattern | Visual | Description |
|---------|--------|-------------|
| **Circuit Breaker** | 🔴🟡🟢 | Attached to a connection. Open/half-open/closed states. Trips on failure threshold |
| **Retry with Backoff** | 🔁 | Retries failed requests with exponential backoff |
| **Timeout** | ⏱️ | Kills request if response not received in X ms |
| **Bulkhead** | 🚧 | Isolates resource pools — failure in one doesn't affect others |
| **Rate Limiter** | 🚦 | Token bucket or sliding window on a connection |
| **Fallback** | 🔀 | Returns cached/default response when primary fails |

---

### 3.11 Infrastructure & Scaling

| Component | Icon | Description |
|-----------|------|-------------|
| **Auto-Scaler** | 📐 | Monitors metrics, spins up/down instances based on rules |
| **Container** | 📦 | Wraps a service — startup time, resource limits |
| **Service Registry** | 📒 | Service discovery — components find each other dynamically |
| **Config Server** | ⚙️📄 | Centralized configuration management |

---

## 4. Component Behavioral Models

### How Each Component Works Internally

Every component follows this structure:

```
Component {
  id: unique identifier
  type: "redis" | "loadbalancer" | "database" | ...
  config: { ... configurable parameters }
  state: { ... internal mutable state }
  rules: [
    { condition → action }
    ...
  ]
  metrics: { ... observable measurements }
  
  process(request) → response | forward | queue | reject
}
```

---

### 4.1 Load Balancer — Full Behavioral Model

```javascript
LoadBalancer {
  config: {
    algorithm: "round-robin" | "least-connections" | "weighted" | 
              "ip-hash" | "random" | "least-response-time"
    healthCheckInterval: 5000  // ms
    healthCheckPath: "/health"
    maxConnectionsPerServer: 1000
    stickySession: false
  }
  
  state: {
    servers: [
      { id, healthy: true, activeConnections: 0, weight: 1, 
        responseTimeAvg: 0, totalRequests: 0 }
    ]
    currentIndex: 0  // for round-robin
  }
  
  rules:
    ON healthCheckTick:
      → for each server: ping healthCheckPath
      → if no response in 3s → mark unhealthy, remove from pool
      → if previously unhealthy server responds → mark healthy, add back
    
    ON request(req):
      → filter healthy servers only
      → if no healthy servers → return 503 Service Unavailable
      → select server based on algorithm:
          round-robin: servers[currentIndex++ % servers.length]
          least-connections: server with min(activeConnections)
          weighted: weighted random based on weight values
          ip-hash: hash(client_ip) % servers.length
          least-response-time: server with min(responseTimeAvg)
      → if server.activeConnections >= maxConnectionsPerServer
          → try next server, or queue, or return 503
      → forward request to selected server
      → server.activeConnections++
    
    ON response(res):
      → server.activeConnections--
      → update server.responseTimeAvg
  
  metrics: {
    totalRequests, requestsPerSecond, activeConnections,
    healthyServerCount, errorRate, avgLatency
  }
}
```

**Emergent Behaviors:**
- Kill a server → traffic redistributes automatically
- One server slows down → least-connections avoids it naturally
- All servers overloaded → 503 errors cascade to clients
- Sticky sessions → uneven load distribution emerges

---

### 4.2 Redis / In-Memory Cache — Full Behavioral Model

```javascript
RedisCache {
  config: {
    maxMemory: 100  // MB
    evictionPolicy: "LRU" | "LFU" | "TTL" | "random" | "noeviction"
    defaultTTL: 3600  // seconds
    maxConnections: 10000
  }
  
  state: {
    store: Map<key, { value, size, ttl, lastAccessed, accessCount, createdAt }>
    currentMemory: 0  // bytes
    activeConnections: 0
    operationsProcessing: 0
  }
  
  rules:
    ON GET(key):
      → activeConnections++
      → if key exists in store AND not expired:
          → update lastAccessed = now
          → update accessCount++
          → return { hit: true, data: value, latency: 0.5ms }  ✅ CACHE HIT
      → if key exists but expired:
          → remove key, free memory
          → return { hit: false }  ❌ CACHE MISS
      → if key doesn't exist:
          → return { hit: false }  ❌ CACHE MISS
    
    ON SET(key, value, ttl):
      → if currentMemory + value.size > maxMemory:
          → if evictionPolicy == "noeviction": return ERROR
          → else: evict keys until enough space:
              LRU: remove key with oldest lastAccessed
              LFU: remove key with lowest accessCount
              TTL: remove key closest to expiry
              random: remove random key
      → store.set(key, { value, size, ttl, lastAccessed: now })
      → currentMemory += value.size
    
    ON tick (every 100ms):
      → scan for expired keys (lazy + active expiry)
      → remove expired, free memory
    
    ON connectionLimit:
      → if activeConnections >= maxConnections
          → reject new connections with error
  
  metrics: {
    hitRate, missRate, memoryUsage, evictionCount,
    opsPerSecond, activeConnections, keyCount
  }
}
```

**Emergent Behaviors:**
- Repeated requests for same key → hit rate climbs naturally
- Traffic exceeds memory → evictions start, hit rate drops
- TTL expires → sudden cache miss storm → database gets hammered ("thundering herd")
- Hot keys → LFU keeps them, LRU might evict them under pressure

---

### 4.3 SQL Database — Full Behavioral Model

```javascript
SQLDatabase {
  config: {
    maxConnections: 50          // connection pool size
    queryProcessingTime: 15     // ms base per query
    writeProcessingTime: 25     // ms base per write
    maxQueueDepth: 500          // max waiting queries
    replicationMode: "none" | "async" | "sync"
    shardingEnabled: false
    shardCount: 1
    indexedFields: []           // queries on indexed fields are faster
  }
  
  state: {
    activeConnections: 0
    queryQueue: []
    cpuUsage: 0                 // 0-100%
    diskIOPS: 0
    replicationLag: 0           // ms (for replicas)
    deadlockCount: 0
    dataSize: 0                 // simulated stored data
  }
  
  rules:
    ON query(request):
      → if activeConnections < maxConnections:
          → activeConnections++
          → processingTime = baseTime * loadMultiplier(cpuUsage)
              loadMultiplier: cpu < 50% → 1x
                              cpu 50-75% → 1.5x
                              cpu 75-90% → 3x
                              cpu > 90% → 8x (severe degradation)
          → if query uses indexed field → processingTime * 0.3
          → if write → processingTime = writeProcessingTime * loadMultiplier
          → schedule response after processingTime
          → cpuUsage += (100 / maxConnections)
      → else if queryQueue.length < maxQueueDepth:
          → queryQueue.push(request)
          → request waits (queue latency added)
      → else:
          → REJECT with "Too Many Connections" error
    
    ON queryComplete:
      → activeConnections--
      → cpuUsage -= (100 / maxConnections)
      → if queryQueue not empty → dequeue next, process
    
    ON replication (if mode != "none"):
      → async: send write to replica after 50-500ms (variable lag)
      → sync: wait for replica ACK before confirming write (slower)
      → if replica down → replication queue grows → lag increases
    
    ON deadlock (probabilistic):
      → if multiple concurrent writes to same "row" → 2% chance deadlock
      → deadlock → one query fails, retry needed
  
  metrics: {
    activeConnections, queueDepth, queryLatencyP50, queryLatencyP99,
    cpuUsage, throughput (qps), errorRate, replicationLag, deadlockCount
  }
}
```

**Emergent Behaviors:**
- High traffic → connection pool fills → queue grows → latency skyrockets
- Database under load → processing time degrades non-linearly (realistic!)
- Kill primary → replica has stale data → read inconsistencies
- Write-heavy load → deadlocks emerge naturally
- No indexing → slow queries block connections → cascade

---

### 4.4 Message Queue — Full Behavioral Model

```javascript
MessageQueue {
  config: {
    maxQueueDepth: 10000
    deliveryGuarantee: "at-least-once" | "at-most-once" | "exactly-once"
    retryPolicy: { maxRetries: 3, backoffMs: 1000 }
    messageTTL: 86400        // seconds
    batchSize: 10
  }
  
  state: {
    queue: []                 // ordered list of messages
    inFlight: Map<msgId, { message, attempts, consumer }>
    deadLetterQueue: []
    producerRate: 0
    consumerRate: 0
  }
  
  rules:
    ON produce(message):
      → if queue.length >= maxQueueDepth:
          → apply backpressure → reject or slow producer
      → queue.push({ id, payload, timestamp, attempts: 0 })
    
    ON consume(consumer):
      → if queue not empty:
          → dequeue message (or batch of batchSize)
          → move to inFlight
          → forward to consumer/worker
      → if queue empty → consumer waits (long polling)
    
    ON ack(messageId):
      → remove from inFlight
      → message successfully processed ✅
    
    ON nack(messageId) or timeout:
      → message.attempts++
      → if attempts < maxRetries:
          → re-queue with backoff delay
      → else:
          → move to deadLetterQueue ☠️
    
    ON tick:
      → check for messages in inFlight longer than timeout
      → treat as nack
      → check for expired messages (TTL)
  
  metrics: {
    queueDepth, producerRate, consumerRate, inFlightCount,
    deadLetterCount, avgProcessingTime, lag
  }
}
```

**Emergent Behaviors:**
- Producer faster than consumer → queue grows → memory pressure
- Consumer crashes → messages re-queued → duplicate processing (at-least-once)
- All retries fail → dead letter queue fills up → alerts trigger
- Multiple consumers → messages distributed, parallel processing

---

### 4.5 API Gateway — Full Behavioral Model

```javascript
APIGateway {
  config: {
    rateLimitPerClient: 100     // requests per second
    rateLimitAlgorithm: "token-bucket" | "sliding-window" | "fixed-window"
    authRequired: true
    authType: "JWT" | "API-key" | "OAuth"
    timeout: 30000              // ms
    maxRequestBodySize: 10      // MB
    corsEnabled: true
    routes: [
      { path: "/api/users", target: "user-service" },
      { path: "/api/orders", target: "order-service" }
    ]
  }
  
  state: {
    rateLimitBuckets: Map<clientId, { tokens, lastRefill }>
    activeRequests: 0
    blockedRequests: 0
  }
  
  rules:
    ON request(req):
      → Step 1: Rate Limit Check
          → get/create bucket for client
          → if tokens > 0 → tokens-- → proceed
          → if tokens == 0 → return 429 Too Many Requests
      
      → Step 2: Authentication
          → if authRequired → validate token/key
          → if invalid → return 401 Unauthorized
          → if expired → return 401 Token Expired
      
      → Step 3: Request Validation
          → if body > maxRequestBodySize → return 413
      
      → Step 4: Routing
          → match path to route
          → if no match → return 404
          → forward to target service
      
      → Step 5: Timeout
          → if no response in timeout → return 504 Gateway Timeout
    
    ON rateLimitRefill (periodic):
      → for each bucket: add tokens back based on algorithm
  
  metrics: {
    totalRequests, blockedByRateLimit, authFailures,
    routingErrors, avgLatency, activeRequests
  }
}
```

---

### 4.6 CDN — Full Behavioral Model

```javascript
CDN {
  config: {
    edgeLocations: ["us-east", "eu-west", "ap-south"]
    cacheTTL: 3600              // seconds
    maxCacheSize: 1000          // MB per edge
    cacheStrategy: "pull" | "push"
    compressionEnabled: true
  }
  
  state: {
    edgeCaches: Map<location, Map<url, { content, expiry, size }>>
    originPulls: 0
  }
  
  rules:
    ON request(req, clientLocation):
      → select nearest edge location
      → if content in edge cache AND not expired:
          → return content (latency: 5-20ms) ✅ CDN HIT
      → else:
          → pull from origin server (latency: 100-500ms)
          → store in edge cache
          → if cache full → evict LRU
          → return content ❌ CDN MISS
    
    ON invalidation(url):
      → remove url from all edge caches
      → next request triggers origin pull
  
  metrics: {
    hitRate, missRate, bandwidthSaved, originPullCount,
    cacheSize per edge, latencyByLocation
  }
}
```

---

### 4.7 Auto-Scaler — Full Behavioral Model

```javascript
AutoScaler {
  config: {
    targetComponent: "app-server"
    minInstances: 2
    maxInstances: 20
    scaleUpThreshold: { cpu: 70, queueDepth: 100 }
    scaleDownThreshold: { cpu: 30, queueDepth: 10 }
    cooldownPeriod: 300         // seconds between scaling actions
    scaleUpStep: 2              // add 2 instances at a time
    scaleDownStep: 1
    startupTime: 30000          // ms for new instance to be ready
  }
  
  state: {
    currentInstances: 2
    lastScaleAction: 0
    pendingInstances: 0         // starting up, not yet ready
  }
  
  rules:
    ON metricCheck (every 10s):
      → collect avg CPU and queue depth from target instances
      → if avg exceeds scaleUpThreshold AND cooldown elapsed:
          → add scaleUpStep instances (they take startupTime to become ready)
          → don't exceed maxInstances
      → if avg below scaleDownThreshold AND cooldown elapsed:
          → remove scaleDownStep instances
          → don't go below minInstances
          → drain connections before removing
  
  metrics: {
    currentInstances, pendingInstances, scalingEvents,
    avgCPUAcrossInstances
  }
}
```

**Emergent Behaviors:**
- Traffic spike → CPU rises → scaler triggers → but startup takes 30s → gap where system is overloaded
- Traffic drops → instances removed → too aggressive? → next spike causes trouble
- Startup time too long → scale-up can't keep up with spike → requests fail during ramp

---

### 4.8 Circuit Breaker — Behavioral Model (Attaches to Connections)

```javascript
CircuitBreaker {
  config: {
    failureThreshold: 5         // failures before opening
    successThreshold: 3         // successes in half-open to close
    timeout: 30000              // ms before trying half-open
    monitorWindow: 60000        // ms window to count failures
  }
  
  state: {
    status: "CLOSED" | "OPEN" | "HALF-OPEN"
    failureCount: 0
    successCount: 0
    lastFailureTime: 0
    openedAt: 0
  }
  
  rules:
    WHEN CLOSED:
      → pass all requests through
      → if request fails → failureCount++
      → if failureCount >= failureThreshold → status = OPEN
    
    WHEN OPEN:
      → reject ALL requests immediately (fast-fail, return 503)
      → if (now - openedAt) > timeout → status = HALF-OPEN
    
    WHEN HALF-OPEN:
      → allow ONE request through (probe)
      → if success → successCount++
          → if successCount >= successThreshold → status = CLOSED, reset
      → if failure → status = OPEN, reset timer
  
  visual:
    CLOSED → green wire
    OPEN → red wire, pulsing, requests bounce back
    HALF-OPEN → yellow wire, single request dot passes through
}
```

---

### 4.9 Rate Limiter — Behavioral Model

```javascript
RateLimiter {
  config: {
    algorithm: "token-bucket" | "sliding-window" | "fixed-window" | "leaky-bucket"
    limit: 100                  // requests per window
    windowSize: 1000            // ms
    bucketCapacity: 100         // for token bucket
    refillRate: 10              // tokens per second
  }
  
  state: {
    // Token Bucket
    tokens: bucketCapacity
    lastRefill: now
    
    // Sliding Window
    requestLog: []              // timestamps of recent requests
    
    // Fixed Window
    windowStart: now
    requestCount: 0
  }
  
  rules (Token Bucket):
    ON request:
      → refill tokens: tokens += (now - lastRefill) * refillRate / 1000
      → cap at bucketCapacity
      → if tokens >= 1 → tokens-- → ALLOW ✅
      → else → REJECT 429 ❌
  
  rules (Sliding Window):
    ON request:
      → remove entries older than windowSize from requestLog
      → if requestLog.length < limit → log timestamp → ALLOW ✅
      → else → REJECT 429 ❌
  
  visual:
    Show token count depleting as requests flow
    Rejected requests bounce back with red flash
    Bucket visual fills/empties in real-time
}
```

---

### 4.10 Serverless Function — Behavioral Model

```javascript
ServerlessFunction {
  config: {
    memoryMB: 256
    timeoutMs: 30000
    maxConcurrency: 1000
    coldStartTime: 500          // ms
    warmDuration: 300000        // ms before instance goes cold
    costPerInvocation: 0.0000002 // $
    costPerGBSecond: 0.0000166  // $
  }
  
  state: {
    warmInstances: 0
    coldInstances: 0
    activeInvocations: 0
    totalInvocations: 0
    totalCost: 0
  }
  
  rules:
    ON invoke(request):
      → if warmInstances > 0:
          → use warm instance (no cold start) → latency = executionTime only
      → else:
          → spin up new instance → latency = coldStartTime + executionTime
          → warmInstances++
      → activeInvocations++
      → if activeInvocations > maxConcurrency → throttle (429)
      → totalCost += calculateCost(memoryMB, executionTime)
    
    ON complete:
      → activeInvocations--
      → reset warm timer for this instance
    
    ON warmTimeout:
      → warmInstances-- → instance becomes cold
  
  metrics: {
    invocations, coldStartRate, avgLatency, concurrency,
    totalCost, throttledRequests
  }
}
```

**Emergent Behaviors:**
- Consistent traffic → warm instances → fast response
- Traffic gap → instances go cold → next request has cold start
- Burst traffic → cold starts spike → latency spikes → visible in animation
- Cost accumulates visually in real-time

---

### 4.11 Additional Component Models (Brief)

#### Search Engine (Elasticsearch-like)
```
State: index size, shard count, replica count, query queue
Rules: Full-text queries take 5-50ms based on index size.
       More shards = better parallelism. 
       Replica down = reduced read throughput.
       Index too large = query slowdown.
```

#### Pub/Sub
```
State: topics, subscribers per topic, message backlog per subscriber
Rules: Message published → fan-out to ALL subscribers.
       Slow subscriber → backlog grows → backpressure.
       Subscriber offline → messages queue (or drop, configurable).
```

#### Object Storage (S3-like)
```
State: stored objects count, total size, bandwidth usage
Rules: Upload → always succeeds (99.999% durability).
       Download → latency based on object size (10-500ms).
       High concurrent downloads → bandwidth throttling.
       Cheap storage, expensive egress.
```

#### Health Check
```
State: monitored components, health status map, check history
Rules: Ping each component every N seconds.
       3 consecutive failures → mark unhealthy → notify dependent components.
       Recovery → mark healthy after 2 consecutive successes.
```

---

## 5. Simulation Engine Architecture

### 5.1 Core Simulation Loop

```
┌──────────────────────────────────────────────────┐
│                SIMULATION ENGINE                  │
│                (Web Worker)                        │
│                                                    │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    │
│  │  Clock    │───▶│  Event   │───▶│Component │    │
│  │  Manager  │    │  Queue   │    │ Registry │    │
│  └──────────┘    └──────────┘    └──────────┘    │
│       │                               │           │
│       │         ┌──────────┐          │           │
│       └────────▶│  Metrics  │◀────────┘           │
│                 │ Collector │                      │
│                 └──────────┘                       │
│                      │                             │
│              ┌───────▼───────┐                     │
│              │  State Sync   │ ── to Main Thread   │
│              │  (postMessage)│    (60fps updates)   │
│              └───────────────┘                      │
└──────────────────────────────────────────────────┘
```

### 5.2 Simulation Tick

```
Each tick (configurable: 1ms-1000ms simulation time per real frame):

1. GENERATE EVENTS
   - Traffic generators create new requests based on pattern
   - Timers fire (TTL expirations, health checks, cron jobs)
   - Scheduled events execute (scale-up completion, cold start, etc.)

2. PROCESS EVENT QUEUE (priority-ordered)
   - For each event:
     a. Route to target component
     b. Component applies its rules
     c. Component updates internal state
     d. Component emits new events (forward, response, error, etc.)
     e. New events added to queue with timestamps

3. COLLECT METRICS
   - Sample all component states
   - Calculate rates (req/s, hit rate, error rate)
   - Update rolling windows (P50, P99 latency)

4. SYNC TO UI (throttled to 60fps)
   - Send state snapshot to main thread via postMessage
   - Include: component states, active request positions, metrics
```

### 5.3 Request Lifecycle

Each request is a message object that flows through the system:

```javascript
Request {
  id: "req-uuid"
  type: "GET" | "POST" | "PUT" | "DELETE"
  path: "/api/users/123"
  source: "client-1"
  createdAt: simulationTime
  currentComponent: "load-balancer-1"
  history: [
    { component: "client-1", action: "created", time: 0 },
    { component: "api-gateway", action: "authenticated", time: 2 },
    { component: "load-balancer", action: "routed-to-server-2", time: 3 },
    { component: "server-2", action: "processing", time: 4 },
    { component: "redis-1", action: "cache-miss", time: 5 },
    { component: "db-primary", action: "queued", time: 6 },
    ...
  ]
  status: "in-flight" | "completed" | "failed" | "timed-out"
  latency: 0  // accumulates as request travels
}
```

This history enables the **distributed tracing** visualization — click any request to see its full journey through the system.

### 5.4 Failure Injection System

Users can inject failures in several ways:

| Failure Type | What Happens | How to Trigger |
|-------------|-------------|----------------|
| **Kill Node** | Component immediately stops processing, all in-flight requests fail | Click component → "Kill" |
| **Slow Down** | Add latency to all operations (simulate network issues) | Click component → "Add Latency" slider |
| **Packet Loss** | Random % of requests to/from this component are dropped | Click connection → "Packet Loss %" |
| **CPU Spike** | Component CPU jumps to 95%, processing slows | Click component → "CPU Spike" |
| **Memory Leak** | Memory slowly increases until OOM crash | Click component → "Memory Leak" |
| **Network Partition** | Two groups of components can't communicate | Select components → "Partition" |
| **Disk Full** | Database can't write, returns errors | Click DB → "Disk Full" |
| **Clock Skew** | Component's time drifts — breaks TTL, distributed locks | Click component → "Clock Skew" |
| **Corrupt Response** | Component returns bad data — tests downstream handling | Click component → "Corrupt Data" |
| **DNS Failure** | DNS stops resolving — new connections fail, cached ones work | Click DNS → "Kill" |

---

## 6. Visual Design System

### 6.1 Canvas & Components

**Canvas:**
- Infinite scrollable canvas with grid background
- Zoom in/out (mouse wheel or pinch)
- Minimap in corner showing full system view
- Dark theme primary, light theme option

**Component Nodes:**
- Rounded rectangle cards with icon + label
- Color-coded by category:
  - 🔵 Blue: Traffic/Clients
  - 🟢 Green: Application layer
  - 🟣 Purple: Caching
  - 🟠 Orange: Databases
  - 🔴 Red: Message queues
  - ⚪ Gray: Infrastructure
  - 🟡 Yellow: Security
- Mini metric display on each node (CPU bar, queue depth, etc.)
- Status indicator dot (green = healthy, yellow = degraded, red = down)

**Connections (Wires):**
- Curved Bezier lines connecting components
- Animated dots traveling along wires (representing requests)
- Dot color: 🟢 success, 🔴 failure, 🟡 slow
- Wire thickness represents throughput (more requests = thicker)
- Wire color represents health (green → yellow → red)

### 6.2 Animation System

**Request Flow Animation:**
```
- Each request = a small glowing dot
- Dot spawns at source, travels along wire to destination
- Speed based on latency (fast = quick travel, slow = crawling)
- At each component: dot enters node, brief pause (processing), exits
- Cache hit: dot bounces back quickly with green glow
- Cache miss: dot continues forward to database with yellow trail
- Error: dot turns red, bounces back with error trail
- Multiple requests: stream of dots flowing along wires
```

**Component State Animations:**
```
HEALTHY:        Gentle pulse/glow, green status dot
UNDER LOAD:     Faster pulse, yellow glow, internal bar fills up
OVERLOADED:     Vibrating/shaking, red glow, metrics flash red
FAILING:        Heavy shake, sparks particle effect, error count flashes
DEAD:           Gray out, cracked/broken visual, X overlay
RECOVERING:     Slow pulse returning, yellow → green transition
SCALING UP:     New node fades in, spinning up animation
SCALING DOWN:   Node fades out gracefully
```

**Queue Visualization:**
```
- Messages shown as small rectangles stacking up inside queue component
- Queue fills visually from bottom to top
- Near capacity: yellow warning glow
- At capacity: red, new messages bounce off
- Dead letter: skull icon, messages slide to DLQ
```

**Connection State Animations:**
```
Circuit Breaker CLOSED:  Green wire, dots flow normally
Circuit Breaker OPEN:    Red wire, dots bounce back at breaker point
Circuit Breaker HALF-OPEN: Yellow wire, single test dot passes
Retry:                   Dot bounces back, waits, tries again (visible retry loop)
Timeout:                 Dot fades out at component (didn't return in time)
```

### 6.3 Metrics Dashboard

A real-time metrics panel (collapsible sidebar or bottom panel):

```
┌─────────────────────────────────────────────┐
│  📊 System Metrics (Live)                    │
├─────────────────────────────────────────────┤
│                                              │
│  Throughput:    ████████████░░  12,450 req/s │
│  Error Rate:    ██░░░░░░░░░░░░  3.2%         │
│  Avg Latency:   ████████░░░░░░  145ms        │
│  P99 Latency:   ██████████████  890ms        │
│                                              │
│  ┌─────────────────────────────────┐         │
│  │  Latency Over Time (line chart) │         │
│  │  ╱╲    ╱╲                       │         │
│  │ ╱  ╲╱╱  ╲╲____╱╲               │         │
│  └─────────────────────────────────┘         │
│                                              │
│  ┌─────────────────────────────────┐         │
│  │  Throughput Over Time           │         │
│  │  ████████████████               │         │
│  │  ████████████████████           │         │
│  └─────────────────────────────────┘         │
│                                              │
│  Component Health:                           │
│  🟢 Load Balancer    🟢 Server-1             │
│  🟡 Server-2         🔴 Server-3             │
│  🟢 Redis            🟡 PostgreSQL           │
│                                              │
│  Cost Estimate: $0.0042/hour                 │
│  (based on equivalent cloud resources)       │
└─────────────────────────────────────────────┘
```

### 6.4 Request Trace View

Click any request dot → opens trace panel:

```
┌────────────────────────────────────────────────┐
│  🔎 Request Trace: req-a1b2c3                   │
│  Status: ✅ Completed | Total Latency: 145ms    │
├────────────────────────────────────────────────┤
│                                                 │
│  Client ──(2ms)──▶ API Gateway                  │
│                     ├── Auth Check: ✅ (1ms)     │
│                     ├── Rate Limit: ✅ (0.1ms)   │
│                     └──(1ms)──▶ Load Balancer    │
│                                 ├── Algorithm: RR│
│                                 └──(0.5ms)──▶ S2│
│                                              │   │
│                     Server-2 ──(3ms)──▶ Redis    │
│                                         ❌ MISS  │
│                     Server-2 ──(85ms)──▶ DB      │
│                                         ✅ Row   │
│                     Server-2 ──(1ms)──▶ Redis SET│
│                     Server-2 ──(0.5ms)──▶ Client │
│                                                  │
│  Timeline:                                       │
│  |--2ms--|--2ms--|--3ms--|----85ms----|--2ms--|   │
│  ▲       ▲       ▲       ▲            ▲       ▲  │
│  client  gw      lb      cache→db     set     ← │
└────────────────────────────────────────────────┘
```

---

## 7. User Interactions & Features

### 7.1 Core Interactions

| Action | How |
|--------|-----|
| Add component | Drag from left sidebar palette onto canvas |
| Connect components | Click output port → drag to input port of another |
| Configure component | Click component → right sidebar shows settings |
| Start simulation | Click ▶️ Play button |
| Pause simulation | Click ⏸️ Pause |
| Speed control | Slider: 0.5x / 1x / 5x / 10x / 100x speed |
| Kill component | Right-click → "Kill Node" or press Delete with node selected |
| Inject failure | Right-click → "Inject Failure" → select type |
| View request trace | Click any animated request dot |
| Zoom | Mouse wheel or pinch |
| Pan | Click and drag on canvas background |
| Select multiple | Shift + click or drag selection box |
| Undo/Redo | Ctrl+Z / Ctrl+Y |

### 7.2 Component Configuration Panel

When a component is selected, right panel shows:

```
┌──────────────────────────────┐
│  ⚙️ Redis Configuration      │
├──────────────────────────────┤
│                              │
│  Max Memory:    [100 MB  ▾]  │
│  Eviction:      [LRU     ▾]  │
│  Default TTL:   [3600s   ▾]  │
│  Max Connections:[10000  ▾]  │
│                              │
│  ── Live Metrics ──          │
│  Hit Rate:      87.3%        │
│  Memory Used:   73.2 MB      │
│  Keys:          12,450       │
│  Evictions:     342          │
│  Connections:   892          │
│                              │
│  ── Actions ──               │
│  [🔴 Kill Node]              │
│  [🐌 Add Latency]            │
│  [💥 Inject Failure]         │
│  [📈 View Detailed Metrics]  │
│                              │
│  ── Internal State ──        │
│  [View Cache Contents]       │
│  (shows actual key-value     │
│   pairs stored in sim)       │
└──────────────────────────────┘
```

### 7.3 Scenario Templates

Pre-built system designs users can load and experiment with:

| Template | Components | Learning Goal |
|----------|-----------|---------------|
| **Simple Web App** | Client → LB → 2 Servers → DB | Basic load balancing, DB bottleneck |
| **Caching Layer** | Client → LB → Server → Redis → DB | Cache hit/miss, thundering herd |
| **Microservices** | Gateway → 3 Services → 3 DBs | Service-to-service communication, cascade failure |
| **Event-Driven** | API → Queue → Workers → DB | Async processing, backpressure |
| **Real-Time Chat** | Clients → WS Server → Pub/Sub → Clients | Pub/sub fan-out, connection limits |
| **CDN + Static** | Clients (multi-region) → CDN → Origin | Edge caching, cache invalidation |
| **Design Twitter** | Full architecture | Complex system, multiple patterns |
| **Design URL Shortener** | Client → LB → App → Cache → DB | Read-heavy system, caching strategy |
| **Design Uber** | Complex | Geo-routing, real-time, queues |

### 7.4 Challenge Mode (Gamification)

Present users with challenges:

```
🎯 Challenge: "Survive the Flash Sale"
   
   Your e-commerce system will experience a traffic spike 
   from 100 to 50,000 requests/sec in 10 seconds.
   
   Current setup: 2 servers, 1 database, no cache.
   
   Objective: Keep error rate below 1% and P99 latency below 500ms.
   
   You have 2 minutes to modify the architecture before the spike hits.
   
   Hints: Consider adding caching, auto-scaling, and rate limiting.
   
   [Start Challenge ▶️]
```

### 7.5 Sharing & Export

- **Share via URL:** Generate shareable link to a design (like Excalidraw)
- **Export as image:** PNG/SVG of the architecture diagram
- **Export as JSON:** Full system config exportable/importable
- **Embed:** Iframe-embeddable for blogs and documentation
- **Record:** Record a simulation run as video/GIF for sharing

---

## 8. Tech Stack & Architecture

### 8.1 Frontend

```
Framework:       Next.js 14+ (App Router)
Language:        TypeScript
Canvas Library:  React Flow / Xyflow (nodes, edges, drag-drop)
Animations:      Framer Motion + Custom Canvas (request dots on edges)
Charts:          Recharts or Visx (metrics graphs)
State:           Zustand (lightweight, perfect for real-time state)
Styling:         Tailwind CSS + CSS Modules (component-level)
Icons:           Lucide React
```

### 8.2 Simulation Engine

```
Runtime:         Web Worker (off main thread)
Architecture:    Discrete Event Simulation (DES)
Communication:   postMessage API (Worker ↔ Main Thread)
                 SharedArrayBuffer (optional, for high-frequency metrics)
Clock:           Virtual clock (simulation time ≠ real time)
```

### 8.3 Backend (minimal for MVP)

```
API:             Next.js API Routes (or separate Express)
Database:        Supabase (PostgreSQL + Auth + Storage)
                 OR Firebase (faster to set up)
Storage:         Supabase Storage (for saved designs)
Auth:            Supabase Auth (Google, GitHub login)
Deploy:          Vercel
```

### 8.4 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│                                                              │
│  ┌────────────────────┐    ┌──────────────────────────────┐  │
│  │   Main Thread       │    │      Web Worker              │  │
│  │                     │    │                              │  │
│  │  ┌───────────────┐  │    │  ┌──────────────────────┐   │  │
│  │  │  React Flow    │  │    │  │  Simulation Engine   │   │  │
│  │  │  (Canvas UI)   │  │    │  │                      │   │  │
│  │  └───────────────┘  │    │  │  ┌─────────────────┐  │   │  │
│  │  ┌───────────────┐  │    │  │  │ Component Models│  │   │  │
│  │  │  Config Panel  │◀═╪════╪══│  │ (state machines)│  │   │  │
│  │  └───────────────┘  │    │  │  └─────────────────┘  │   │  │
│  │  ┌───────────────┐  │    │  │  ┌─────────────────┐  │   │  │
│  │  │  Metrics Dash  │◀═╪════╪══│  │ Event Queue     │  │   │  │
│  │  └───────────────┘  │    │  │  └─────────────────┘  │   │  │
│  │  ┌───────────────┐  │    │  │  ┌─────────────────┐  │   │  │
│  │  │  Animation     │◀═╪════╪══│  │ Metrics Collect │  │   │  │
│  │  │  Engine        │  │    │  │  └─────────────────┘  │   │  │
│  │  └───────────────┘  │    │  └──────────────────────┘   │  │
│  └────────────────────┘    └──────────────────────────────┘  │
│            │                                                  │
│     ═══════╪══════════════════════════════════════            │
│            │  postMessage (state sync @ 60fps)                │
└────────────┼──────────────────────────────────────────────────┘
             │
      ┌──────▼──────┐
      │   Vercel     │
      │  (Next.js)   │
      │              │
      │  API Routes  │───▶  Supabase (designs, auth, sharing)
      └──────────────┘
```

### 8.5 File Structure

```
sysflow/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Landing page
│   │   ├── editor/
│   │   │   └── page.tsx              # Main editor canvas
│   │   ├── templates/
│   │   │   └── page.tsx              # Template gallery
│   │   ├── challenges/
│   │   │   └── page.tsx              # Challenge mode
│   │   └── api/
│   │       ├── designs/              # CRUD for saved designs
│   │       └── share/                # Share link generation
│   │
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── SystemCanvas.tsx      # React Flow wrapper
│   │   │   ├── ConnectionWire.tsx    # Custom animated edge
│   │   │   └── RequestDot.tsx        # Animated request particle
│   │   ├── nodes/                    # React Flow custom nodes
│   │   │   ├── BaseNode.tsx          # Base component node
│   │   │   ├── LoadBalancerNode.tsx
│   │   │   ├── CacheNode.tsx
│   │   │   ├── DatabaseNode.tsx
│   │   │   ├── ServerNode.tsx
│   │   │   ├── QueueNode.tsx
│   │   │   ├── CDNNode.tsx
│   │   │   ├── GatewayNode.tsx
│   │   │   ├── ClientNode.tsx
│   │   │   └── ... (one per component type)
│   │   ├── panels/
│   │   │   ├── ComponentPalette.tsx   # Left sidebar - drag components
│   │   │   ├── ConfigPanel.tsx        # Right sidebar - configure selected
│   │   │   ├── MetricsDashboard.tsx   # Bottom panel - live metrics
│   │   │   └── RequestTrace.tsx       # Trace view for individual requests
│   │   ├── controls/
│   │   │   ├── PlaybackControls.tsx   # Play/Pause/Speed
│   │   │   ├── TrafficControl.tsx     # Traffic pattern selector
│   │   │   └── FailureInjector.tsx    # Failure injection menu
│   │   └── ui/                        # Shared UI components
│   │       ├── Button.tsx
│   │       ├── Slider.tsx
│   │       ├── Select.tsx
│   │       └── Tooltip.tsx
│   │
│   ├── simulation/                    # Simulation Engine (runs in Worker)
│   │   ├── engine.ts                  # Main simulation loop
│   │   ├── clock.ts                   # Virtual clock management
│   │   ├── eventQueue.ts             # Priority event queue
│   │   ├── metricsCollector.ts       # Metrics aggregation
│   │   ├── requestTracker.ts         # Request lifecycle tracking
│   │   ├── worker.ts                 # Web Worker entry point
│   │   └── models/                   # Component behavioral models
│   │       ├── base.ts               # Base component model
│   │       ├── loadBalancer.ts
│   │       ├── cache.ts
│   │       ├── database.ts
│   │       ├── server.ts
│   │       ├── messageQueue.ts
│   │       ├── apiGateway.ts
│   │       ├── cdn.ts
│   │       ├── autoScaler.ts
│   │       ├── circuitBreaker.ts
│   │       ├── rateLimiter.ts
│   │       ├── serverlessFunction.ts
│   │       ├── pubsub.ts
│   │       ├── searchEngine.ts
│   │       ├── objectStorage.ts
│   │       ├── healthCheck.ts
│   │       ├── authService.ts
│   │       ├── dnsService.ts
│   │       └── index.ts              # Registry of all models
│   │
│   ├── store/                         # Zustand state management
│   │   ├── canvasStore.ts            # Nodes, edges, positions
│   │   ├── simulationStore.ts        # Simulation state, metrics
│   │   └── uiStore.ts               # UI state (panels, selection)
│   │
│   ├── templates/                     # Pre-built system templates
│   │   ├── simpleWebApp.ts
│   │   ├── cachingLayer.ts
│   │   ├── microservices.ts
│   │   ├── eventDriven.ts
│   │   ├── designTwitter.ts
│   │   ├── designUrlShortener.ts
│   │   └── index.ts
│   │
│   ├── challenges/                    # Challenge definitions
│   │   ├── flashSale.ts
│   │   ├── cascadeFailure.ts
│   │   ├── cacheStampede.ts
│   │   └── index.ts
│   │
│   ├── hooks/                         # Custom React hooks
│   │   ├── useSimulation.ts          # Hook to interact with worker
│   │   ├── useMetrics.ts             # Hook for real-time metrics
│   │   └── useComponentConfig.ts     # Hook for component settings
│   │
│   ├── utils/
│   │   ├── colors.ts                 # Component color system
│   │   ├── animations.ts            # Animation utilities
│   │   └── serialization.ts         # Import/export designs
│   │
│   └── types/
│       ├── components.ts             # Component type definitions
│       ├── simulation.ts             # Simulation event types
│       ├── metrics.ts                # Metric data types
│       └── requests.ts              # Request/Response types
│
├── public/
│   ├── icons/                         # Component icons (SVG)
│   └── templates/                     # Template preview images
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## 9. MVP Phasing & Roadmap

### Phase 1: Core Canvas + 5 Components (Weeks 1-3)

**Goal:** Drag-drop canvas with basic simulation working

**Components to build:**
- ✅ Traffic Generator (Client)
- ✅ Load Balancer (Round Robin + Least Connections)
- ✅ Application Server (CPU, memory, connection tracking)
- ✅ In-Memory Cache (Redis model — hit/miss, eviction)
- ✅ SQL Database (connection pool, queue, degradation)

**Features:**
- ✅ Drag-drop from palette to canvas
- ✅ Wire components with connections
- ✅ Play/Pause/Speed controls
- ✅ Animated request dots flowing along wires
- ✅ Basic component state (healthy/overloaded/dead)
- ✅ Kill a node (right-click)
- ✅ Simple metrics display on each node
- ✅ Traffic slider (1 to 100K req/s)

**Skip for now:** Auth, saving, sharing, templates, challenges

---

### Phase 2: More Components + Visual Polish (Weeks 4-6)

**New components:**
- ✅ API Gateway (routing, rate limiting)
- ✅ Message Queue (with dead letter queue)
- ✅ CDN
- ✅ Auto-Scaler
- ✅ Circuit Breaker (attaches to connections)

**Features:**
- ✅ Full animation system (shaking, glowing, breaking)
- ✅ Metrics dashboard (bottom panel with charts)
- ✅ Request trace view (click a request → see journey)
- ✅ Component configuration panel
- ✅ Traffic patterns (constant, spike, ramp)
- ✅ Failure injection menu
- ✅ 3 pre-built templates

**Skip:** Auth, saving

---

### Phase 3: Save, Share, Templates (Weeks 7-8)

**Features:**
- ✅ User authentication (GitHub/Google login via Supabase)
- ✅ Save designs to account
- ✅ Share via URL (like Excalidraw links)
- ✅ Export as PNG/SVG
- ✅ 6+ templates
- ✅ Landing page

---

### Phase 4: Challenge Mode + Remaining Components (Weeks 9-12)

**New components:**
- ✅ Serverless Function
- ✅ Pub/Sub
- ✅ Rate Limiter (standalone)
- ✅ Search Engine
- ✅ Object Storage
- ✅ WebSocket Server
- ✅ Health Check / Monitoring
- ✅ DNS

**Features:**
- ✅ Challenge mode (gamified learning)
- ✅ Collaborative editing (Supabase Realtime)
- ✅ Design forking (fork someone's shared design)
- ✅ Cost estimation panel

---

### Phase 5: Monetization + Growth (Months 4+)

- ✅ Free tier limits (3 saved designs, basic components)
- ✅ Pro tier ($5-8/month)
- ✅ Embeddable widget for tech blogs
- ✅ API for programmatic design creation
- ✅ Community template gallery
- ✅ "Interview Prep" challenge pack

---

## 10. Monetization Strategy

### Freemium Model

| Feature | Free | Pro ($5-8/mo) | Team ($15/mo) |
|---------|------|---------------|---------------|
| Saved designs | 3 | Unlimited | Unlimited |
| Components | Basic 5 | All 20+ | All 20+ |
| Templates | 3 | All | All + custom |
| Challenge mode | 3 challenges | All | All |
| Traffic scale | Up to 10K | Up to 10M | Up to 10M |
| Export | PNG only | PNG + SVG + JSON | All + embed |
| Sharing | View-only link | Editable link | Team workspace |
| Request tracing | Basic | Full trace + history | Full |
| Failure injection | Kill only | All failure types | All |
| Collaboration | ❌ | ❌ | ✅ Real-time |

### Revenue Channels

1. **Individual subscriptions** — developers learning system design
2. **Team plans** — engineering teams prototyping architectures
3. **Educator licenses** — bootcamps and courses embedding in curriculum
4. **Sponsored templates** — cloud providers sponsor "Design on AWS/GCP" templates
5. **Embedded widget** — tech blogs pay to embed interactive diagrams

---

## 11. Competitive Differentiation

### vs. Paperdraw
| Paperdraw | SysFlow |
|-----------|---------|
| Deterministic math | Emergent behavior from rules |
| "Here's the answer" | "Discover the answer" |
| Static numbers | Dynamic, timing-dependent outcomes |
| No failure injection | Rich failure injection system |
| No request tracing | Full distributed tracing visualization |
| No challenge mode | Gamified learning challenges |

### vs. Excalidraw / draw.io
| Drawing Tools | SysFlow |
|--------------|---------|
| Static diagrams | Living, simulated systems |
| No behavior | Real component behavior |
| Just shapes | Domain-specific system components |
| No metrics | Real-time metrics dashboard |

### vs. ByteByteGo / Educative
| Education Platforms | SysFlow |
|--------------------|---------|
| Watch/read passively | Build and experiment actively |
| Pre-recorded outcomes | Discover outcomes yourself |
| Can't modify the design | Full control over architecture |
| No hands-on practice | Hands-on failure testing |

### Why This Stands Out on a Resume
This project demonstrates:
- Deep understanding of distributed systems internals
- Complex state management (simulation engine)
- Advanced frontend skills (React Flow, animations, Web Workers)
- Product thinking (templates, challenges, sharing)
- Performance optimization (60fps simulation rendering)
- Full-stack capability (auth, storage, deployment)

---

## Appendix A: Key Distributed Systems Concepts to Simulate

Each concept should be **discoverable** through experimentation, not taught explicitly:

| Concept | How User Discovers It |
|---------|----------------------|
| Cache Stampede / Thundering Herd | Set short TTL on popular key, watch all requests hit DB when it expires |
| Hot Partition | Use hash-based sharding, send many requests with same key → one shard overloaded |
| Cascade Failure | Kill one downstream service → upstream queues fill → upstream fails → chain reaction |
| Split Brain | Network partition between DB replicas → both accept writes → data inconsistency |
| Back Pressure | Producer faster than consumer → queue fills → producer must slow down or crash |
| Connection Pool Exhaustion | Slow DB queries hold connections → pool empties → new requests rejected |
| Cold Start Penalty | Serverless function idle → cold start → latency spike on first request |
| Retry Storm | Service fails → all clients retry → load multiplies → service stays down |
| Head-of-Line Blocking | One slow request blocks queue → all subsequent requests delayed |
| Noisy Neighbor | One service hogs shared resource → other services degrade |
| Replication Lag | Async replica falls behind → reads return stale data |
| Write Amplification | Write-through cache + multiple replicas → one write becomes many |

---

## Appendix B: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play / Pause simulation |
| `1-5` | Set speed (1x, 2x, 5x, 10x, 100x) |
| `Delete` / `Backspace` | Remove selected component |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Save design |
| `Ctrl+E` | Export |
| `Ctrl+D` | Duplicate selected |
| `F` | Fit all components in view |
| `G` | Toggle grid |
| `M` | Toggle minimap |
| `T` | Open template gallery |
| `K` | Kill selected node (during simulation) |
| `R` | Reset simulation |

---

## Appendix C: Estimated Development Hours

| Module | Estimated Hours | Priority |
|--------|---------------:|----------|
| React Flow canvas setup | 8h | P0 |
| Component palette (drag-drop) | 6h | P0 |
| Wire connections + routing | 8h | P0 |
| Simulation engine (core loop) | 16h | P0 |
| Event queue system | 8h | P0 |
| Load Balancer model | 6h | P0 |
| Cache (Redis) model | 6h | P0 |
| Database model | 8h | P0 |
| Server model | 4h | P0 |
| Traffic Generator model | 4h | P0 |
| Request animation system | 16h | P0 |
| Component state animations | 12h | P0 |
| Metrics collection | 8h | P1 |
| Metrics dashboard UI | 12h | P1 |
| Request trace view | 10h | P1 |
| Config panel UI | 8h | P1 |
| API Gateway model | 6h | P1 |
| Message Queue model | 6h | P1 |
| CDN model | 4h | P1 |
| Auto-Scaler model | 6h | P1 |
| Circuit Breaker model | 4h | P1 |
| Failure injection system | 8h | P1 |
| Traffic patterns | 4h | P1 |
| Templates (pre-built designs) | 8h | P2 |
| Auth + user accounts | 6h | P2 |
| Save/load designs | 8h | P2 |
| Share via URL | 6h | P2 |
| Export (PNG/SVG) | 4h | P2 |
| Challenge mode | 16h | P3 |
| Remaining component models (8+) | 32h | P3 |
| Landing page | 8h | P2 |
| **TOTAL** | **~280h** | |

At ~4 hours/day → **~10-12 weeks** for full product.
MVP (P0 only) → **~4 weeks** at 4hrs/day.

---

*This document is the complete specification for SysFlow. Use it as the blueprint for development. Start with Phase 1, ship fast, iterate based on user feedback.*
