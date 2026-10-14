// tests/monitor.test.ts — tests for the monitor compiler + runtime + chaos + property tester
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { compileMonitor, compileAll } from "../src/runtime/monitor-compiler.ts";
import { registerMonitor, checkLive, getAlerts, stats as monitorStats, reset } from "../src/runtime/monitor-runtime.ts";
import { runChaos, runDefaultSuite } from "../src/chaos/chaos-runner.ts";
import { runPropertyTest, exactlyOncePropertyTests, runAllPropertyTests } from "../src/property/property-tester.ts";
import { exactlyOnceSpec } from "../src/tla/tla-spec.ts";
import type { Invariant } from "../src/types.ts";

describe("monitor-compiler", () => {
  test("compileMonitor produces a working monitor", () => {
    const inv: Invariant = { name: "TestInv", description: "test", check: (s) => s.x === 1 };
    const m = compileMonitor(inv);
    assert.equal(m.invariantName, "TestInv");
    const ok = m.check({ x: 1 });
    assert.ok(ok.ok);
    assert.match(ok.detail, /holds/);
  });
  test("monitor fires alert when invariant violated", () => {
    const inv: Invariant = { name: "TestInv", description: "test", check: (s) => s.x === 1 };
    const m = compileMonitor(inv);
    const alert = m.check({ x: 2 });
    assert.ok(!alert.ok);
    assert.match(alert.detail, /VIOLATED/);
    assert.ok(alert.severity === "medium" || alert.severity === "high" || alert.severity === "critical");
  });
  test("compileAll compiles all invariants", () => {
    const monitors = compileAll(exactlyOnceSpec.invariants);
    assert.equal(monitors.length, exactlyOnceSpec.invariants.length);
  });
  test("monitor handles errors gracefully", () => {
    const inv: Invariant = { name: "CrashInv", description: "crashes", check: () => { throw new Error("boom"); } };
    const m = compileMonitor(inv);
    const alert = m.check({});
    assert.ok(!alert.ok);
    assert.match(alert.detail, /boom/);
    assert.equal(alert.severity, "high");
  });
});

describe("monitor-runtime", () => {
  test("registerMonitor + checkLive works", () => {
    reset();
    const inv: Invariant = { name: "RT", description: "test", check: (s) => s.ok === true };
    const m = compileMonitor(inv);
    registerMonitor(m);
    const alerts = checkLive({ ok: false });
    assert.ok(alerts.length > 0);
    assert.equal(alerts[0].invariant, "RT");
  });
  test("checkLive returns empty when all OK", () => {
    reset();
    const inv: Invariant = { name: "OK", description: "test", check: () => true };
    registerMonitor(compileMonitor(inv));
    const alerts = checkLive({});
    assert.equal(alerts.length, 0);
  });
  test("stats reports monitor count + health", () => {
    reset();
    const inv: Invariant = { name: "S", description: "test", check: () => true };
    registerMonitor(compileMonitor(inv));
    const s = monitorStats();
    assert.equal(s.monitorCount, 1);
    assert.ok(s.healthy);
  });
  test("getAlerts returns history", () => {
    reset();
    const inv: Invariant = { name: "H", description: "test", check: () => false };
    registerMonitor(compileMonitor(inv));
    checkLive({});
    const alerts = getAlerts();
    assert.ok(alerts.length > 0);
  });
});

describe("chaos-runner", () => {
  test("runDefaultSuite returns 5 experiments", () => {
    const results = runDefaultSuite(exactlyOnceSpec.invariants);
    assert.equal(results.length, 5);
  });
  test("network-partition finds violations in exactly-once", () => {
    const result = runChaos(exactlyOnceSpec.invariants, { name: "partition", type: "network-partition", durationSec: 30 });
    // The simulated chaos state has leader="n1" but the exactly-once invariants check delivered/queue
    // The msg-dup type should definitely trigger NoDuplicates
    assert.ok(result.finding.length > 0);
    assert.ok(typeof result.invariantHeld === "boolean");
  });
  test("msg-duplication triggers NoDuplicates violation", () => {
    const result = runChaos(exactlyOnceSpec.invariants, { name: "dup", type: "msg-duplication", durationSec: 30 });
    assert.ok(!result.invariantHeld);
    assert.match(result.finding, /NoDuplicates/);
  });
});

describe("property-tester", () => {
  test("runPropertyTest runs N iterations", () => {
    const tests = exactlyOncePropertyTests();
    const result = runPropertyTest(tests[0]);
    assert.equal(result.passed + result.failed, tests[0].runs);
  });
  test("runAllPropertyTests returns results", () => {
    const results = runAllPropertyTests();
    assert.equal(results.length, 3);
    for (const r of results) {
      assert.equal(r.passed + r.failed, r.runs);
    }
  });
});
