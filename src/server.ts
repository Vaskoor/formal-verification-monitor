import express from "express";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
const startedAt = Date.now();
let tick = 0;
const invariants = [
  { name: "LeaderElection_UniqueLeader", status: "holds", violations: 0 },
  { name: "Consensus_Agreement", status: "holds", violations: 0 },
  { name: "ExactlyOnce_NoDoubleDeliver", status: "violated", violations: 1 },
  { name: "FIFO_Ordering", status: "holds", violations: 0 },
  { name: "LinearizableReads", status: "holds", violations: 0 },
];
const monitors = [
  { name: "rt:leader_count", state: "healthy" },
  { name: "rt:deliver_count", state: "alert" },
  { name: "rt:commit_quorum", state: "healthy" },
];
function sim() {
  tick++;
  const states = 1.2e6 + tick * 14000;
  const depth = 100 + tick;
  const chaos = [
    { exp: "network-partition (3 nodes)", found: "stale-read after 2s partition", severity: "high" },
    { exp: "clock-skew ±500ms", found: "term-monotonicity holds", severity: "none" },
    { exp: "slow-disk 5s", found: "leader-lease expired → dual-leader", severity: "critical" },
    { exp: "msg-dup 2%", found: "exactly-once VIOLATED (redelivery)", severity: "high" },
  ];
  return { statesExplored: states, depthBound: depth, invariants, monitors, chaos, bugsFound: invariants.filter(i => i.violations > 0).length + chaos.filter(c => c.severity !== "none").length };
}
app.get("/api/status", (_q, r) => r.json({ ok: true, uptime: Math.round((Date.now() - startedAt) / 1000), ...sim() }));
app.get("/health", (_q, r) => r.json({ ok: true }));
app.use(express.static(path.join(__dirname, "../public")));
app.get("/", (_q, r) => r.sendFile(path.join(__dirname, "../public/index.html")));
app.listen(Number(process.env.PORT ?? 4303), () => console.log("formal-verification → http://localhost:4303"));
