// src/server.ts — Formal Verification + Runtime Monitoring: full API + dashboard
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { PLATFORM_CONFIG } from "./config.js";
import { exactlyOnceSpec, leaderElectionSpec, fifoOrderSpec, getSpec, listSpecs } from "./tla/tla-spec.js";
import { checkInvariants } from "./tla/invariant-checker.js";
import { modelCheck, summarizeCheck } from "./checker/model-checker.js";
import { compileAll } from "./runtime/monitor-compiler.js";
import { registerMonitor, checkLive, getAlerts, stats as monitorStats, reset } from "./runtime/monitor-runtime.js";
import { runDefaultSuite } from "./chaos/chaos-runner.js";
import { runAllPropertyTests } from "./property/property-tester.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));
const startedAt = Date.now();

// Pre-compile monitors for the exactly-once spec
const monitors = compileAll(exactlyOnceSpec.invariants);
monitors.forEach(registerMonitor);

app.get("/health", (_q, r) => r.json({ ok: true, version: PLATFORM_CONFIG.version, uptime: Math.round((Date.now() - startedAt) / 1000) }));

app.get("/api/status", (_q, r) => {
  // Run model check on all specs
  const specs = [exactlyOnceSpec, leaderElectionSpec, fifoOrderSpec];
  const results = specs.map(s => ({ spec: s.name, ...summarizeCheck(modelCheck(s, 20, 5000)) }));
  const chaos = runDefaultSuite(exactlyOnceSpec.invariants);
  const props = runAllPropertyTests();
  const mStats = monitorStats();
  r.json({
    ok: true,
    statesExplored: results.reduce((sum, res) => sum + res.totalStates, 0),
    bugsFound: results.reduce((sum, res) => sum + res.violations, 0) + chaos.filter(c => !c.invariantHeld).length,
    specs: listSpecs(),
    results,
    chaos,
    propertyTests: props,
    monitors: mStats,
  });
});

app.get("/api/specs", (_q, r) => r.json({ specs: listSpecs() }));

app.get("/api/specs/:name", (req, r) => {
  const spec = getSpec(req.params.name);
  if (!spec) return r.status(404).json({ error: "spec not found" });
  r.json({ name: spec.name, kind: spec.kind, variables: spec.variables, invariants: spec.invariants.map(i => ({ name: i.name, description: i.description })) });
});

app.post("/api/check", (req, r) => {
  const { spec: specName, maxDepth = 20, maxStates = 5000 } = req.body || {};
  const spec = getSpec(specName) || exactlyOnceSpec;
  const result = modelCheck(spec, maxDepth, maxStates);
  r.json({ ...result, summary: summarizeCheck(result) });
});

app.post("/api/monitor/check", (req, r) => {
  const { state } = req.body || {};
  if (!state) return r.status(400).json({ error: "state required" });
  const alerts = checkLive(state);
  r.json({ alerts, stats: monitorStats() });
});

app.get("/api/monitor/alerts", (_q, r) => r.json({ alerts: getAlerts(), stats: monitorStats() }));

app.get("/api/chaos", (_q, r) => {
  r.json({ experiments: runDefaultSuite(exactlyOnceSpec.invariants) });
});

app.get("/api/property", (_q, r) => r.json({ tests: runAllPropertyTests() }));

app.use(express.static(path.join(__dirname, "../public")));
app.get("/", (_q, r) => r.sendFile(path.join(__dirname, "../public/index.html")));

app.listen(Number(process.env.PORT ?? PLATFORM_CONFIG.defaultPort), () =>
  console.log(`formal-verification-monitor → http://localhost:${PLATFORM_CONFIG.defaultPort}`));
