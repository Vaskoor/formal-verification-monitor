# Formal Verification + Runtime Monitoring for Distributed Systems

<div align="center">

**Prove correctness of a distributed protocol with TLA+, then enforce it at runtime.**

![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## Overview

A platform that models a distributed protocol in TLA+/PlusCal, exhaustively explores the state space via model checking to find invariant violations no test suite would catch, compiles those invariants into runtime monitors deployed with the service, and validates the model via Jepsen-style chaos experiments.

```
TLA+ Spec ──▶ Model Checker (BFS) ──▶ Invariants verified?
   │              │                         │
   │              │                         ▼
   │              │              Violations found → bug report
   │              │
   │              ▼
   │      Monitor Compiler ──▶ Runtime Monitors (injected into Go/Rust)
   │                                │
   │                                ▼
   │                        Live state checked every 1s
   │                                │
   ▼                                ▼
Chaos Runner ──▶ Jepsen-style    Property Tester ──▶ Random inputs
  experiments    + Chaos Mesh      checked against model
  (partition,      + msg dup       (no-dup, ordered, unique leader)
   clock skew,
   slow disk,
   msg loss)
```

## Architecture

```
src/
├── types.ts                        # TlaSpec, Invariant, ModelState, Violation, CompiledMonitor, ChaosExperiment
├── config.ts                       # Platform config (max states, max depth, monitor interval)
├── tla/
│   ├── tla-spec.ts                 # 3 built-in protocol models: ExactlyOnce, LeaderElection, FifoOrdering
│   └── invariant-checker.ts       # Check invariants against model states + severity classification
├── checker/
│   └── model-checker.ts           # BFS state-space exploration: init → next → check → repeat
├── runtime/
│   ├── monitor-compiler.ts        # Compile invariants → runtime monitor functions
│   └── monitor-runtime.ts        # Register monitors, check live state, alert history
├── chaos/
│   └── chaos-runner.ts            # 5 chaos types: partition, clock-skew, slow-disk, msg-dup, msg-loss
├── property/
│   └── property-tester.ts         # Property-based testing (100 runs per property)
└── server.ts                       # Express API: /api/specs, /api/check, /api/monitor, /api/chaos, /api/property
```

## Core Modules

### TLA+ Specs (`tla/tla-spec.ts`)
3 built-in protocol models, each with `init()`, `next()`, and invariants:

| Spec | Variables | Invariants | Kind |
|------|-----------|------------|------|
| ExactlyOnce | delivered, queue | NoDuplicates, AllDelivered | exactly-once |
| LeaderElection | nodes, leader | UniqueLeader, LeaderIsKnown | leader-election |
| FifoOrdering | sent, delivered | OrderedDelivery | fifo-ordered |

Each spec's `next()` generates successor states (including intentionally buggy paths like duplicate delivery).

### Invariant Checker (`tla/invariant-checker.ts`)
- `checkInvariants()` — evaluates all invariants against a state, returns violations with severity
- Severity classification: "duplicate" → critical, "unique" → critical, "order" → high, else medium

### Model Checker (`checker/model-checker.ts`)
- BFS state-space exploration: starts from `init()`, applies `next()` to generate successors, checks invariants at every state
- Deduplication via state keys (sorted JSON)
- Bounded by `maxDepth` + `maxStates`
- Finds ALL violations (not just the first)

### Monitor Compiler (`runtime/monitor-compiler.ts`)
- `compileMonitor()` — transforms an invariant into a runtime monitor function
- The monitor takes live state → returns `{ok, detail, severity}`
- Handles errors gracefully (monitor crash → alert, not service crash)

### Monitor Runtime (`runtime/monitor-runtime.ts`)
- `registerMonitor()` — register compiled monitors
- `checkLive()` — check live state against all monitors, collect alerts
- `getAlerts()` — alert history (max 1000)
- `stats()` — monitor count + health status

### Chaos Runner (`chaos/chaos-runner.ts`)
5 Jepsen-style chaos experiments:

| Experiment | Effect | Simulated State |
|-----------|--------|-----------------|
| Network Partition | Split-brain (2 leaders) | `{leader: "n1", partitioned: true}` |
| Clock Skew | Out-of-order delivery | `{delivered: ["c","a"], clockDrift: 500}` |
| Slow Disk | Stale reads | `{leader: "n1", staleRead: true}` |
| Msg Duplication | Re-delivered message | `{delivered: ["m1","m1","m2"]}` |
| Msg Loss | Lost message | `{delivered: ["m1"], lost: ["m2"]}` |

Each experiment checks whether invariants still hold under the fault condition.

### Property Tester (`property/property-tester.ts`)
3 built-in property tests with random generators:

| Property | Generator | Check |
|----------|-----------|-------|
| no-duplicate-delivery | random message arrays | no duplicates (unique set size = array length) |
| delivery-preserves-order | ordered message arrays | non-decreasing order |
| at-most-one-leader | random node+leader | leader is a known node |

Each runs 50-100 iterations and reports pass/fail + counterexample.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness + version + uptime |
| `GET` | `/api/status` | Full state: specs, model check results, chaos, property tests, monitors |
| `GET` | `/api/specs` | List all built-in specs |
| `GET` | `/api/specs/:name` | Get spec details |
| `POST` | `/api/check` | Run model checker (spec name, maxDepth, maxStates) |
| `POST` | `/api/monitor/check` | Check live state against runtime monitors |
| `GET` | `/api/monitor/alerts` | Get alert history + monitor stats |
| `GET` | `/api/chaos` | Run default chaos suite |
| `GET` | `/api/property` | Run all property tests |

## Tests

```bash
npm test    # 24 unit tests
```

- `tests/invariant.test.ts` — 11 tests: TLA+ spec structure (4) + invariant checking (7)
- `tests/model-checker.test.ts` — 5 tests: state exploration, violation detection, summarize
- `tests/monitor.test.ts` — 8 tests: compiler (4) + runtime (4) + chaos (3) + property (2)

## PlusCal Spec (ExactlyOnce)

```
---- MODULE ExactlyOnce ----
VARIABLES delivered, queue
Init == delivered = << >> /\ queue = << >>
Deliver(msg) == /\ msg \notin delivered
               /\ delivered' = Append(delivered, msg)
               /\ queue' = Tail(queue)
Next == /\ Len(queue) > 0 /\ Deliver(Head(queue))
Inv == \A m \in delivered : delivered has no duplicates
==============================
```

## Docker

```bash
docker compose -f docker/docker-compose.yml up -d   # Jepsen + Chaos Mesh + Prometheus
```

## Run

```bash
npm install
npm test          # 24 tests
npm run dev       # → http://localhost:4303
```

## Stack
TLA+ · PlusCal · Rust/Go · Jepsen · Chaos Mesh · Prometheus · TypeScript · Express

## License
MIT
