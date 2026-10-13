# Formal Verification + Runtime Monitoring for Distributed Systems

<div align="center">**Prove correctness of a distributed protocol with TLA+ or Alloy, then enforce it at runtime.**</div>

## What it does
1. **Model** the protocol (leader election, consensus, exactly-once delivery) in TLA+/PlusCal.
2. **Model-check** (TLC) — exhaustively explore the state space; find invariant violations no test suite would catch.
3. **Inject runtime monitors** — compile invariants into Go/Rust assertions deployed with the service.
4. **Chaos validate** — Jepsen-style + Chaos Mesh experiments confirm the model holds at runtime.
5. **Report**: *"Here's a bug formal methods found that 10,000 unit tests missed."*

## Dashboard
- States explored + depth bound
- Per-invariant status (holds / violated) + violation count
- Runtime monitor states (healthy / alert)
- Chaos experiment findings (network partition, clock skew, slow disk, msg dup) with severity

## Architecture
| Layer | Tech |
|-------|------|
| Spec language | TLA+ / PlusCal |
| Model checker | TLC (state-space exploration) |
| Runtime | Go / Rust monitors compiled from invariants |
| Chaos | Jepsen + Chaos Mesh |
| Property tests | Hypothesis / rapid-check against the model |

## Run
```bash
npm install && npm run dev   # → http://localhost:4303
```
## Why it's OG
Deep CS credibility — impresses infra, database, and blockchain companies.
## License
MIT
