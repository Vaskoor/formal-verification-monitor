// tests/model-checker.test.ts — tests for the BFS model checker
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { modelCheck, summarizeCheck } from "../src/checker/model-checker.ts";
import { exactlyOnceSpec, leaderElectionSpec } from "../src/tla/tla-spec.ts";

describe("model-checker", () => {
  test("explores states and returns a result", () => {
    const r = modelCheck(leaderElectionSpec, 3, 100);
    assert.ok(r.totalStates > 0);
    assert.ok(r.durationMs >= 0);
    assert.equal(r.invariantsChecked, leaderElectionSpec.invariants.length);
  });
  test("finds violations in exactly-once spec", () => {
    const r = modelCheck(exactlyOnceSpec, 5, 500);
    // The exactly-once spec intentionally allows duplicate delivery in its Next action
    // → the NoDuplicates invariant should find violations
    assert.ok(r.violations.length > 0);
    assert.ok(r.violations.some(v => v.invariant === "NoDuplicates"));
  });
  test("violations have severity classification", () => {
    const r = modelCheck(exactlyOnceSpec, 5, 500);
    for (const v of r.violations) {
      assert.ok(["none","low","medium","high","critical"].includes(v.severity));
    }
  });
  test("summarizeCheck returns balanced when no violations", () => {
    const r = { totalStates: 10, depthBound: 5, violations: [], invariantsChecked: 2, durationMs: 1 };
    const s = summarizeCheck(r);
    assert.equal(s.balanced, true);
    assert.equal(s.violations, 0);
  });
  test("summarizeCheck returns unbalanced when violations exist", () => {
    const r = { totalStates: 10, depthBound: 5, violations: [{ invariant: "X", state: {}, depth: 1, detail: "", severity: "high" as const }], invariantsChecked: 2, durationMs: 1 };
    const s = summarizeCheck(r);
    assert.equal(s.balanced, false);
    assert.equal(s.violations, 1);
    assert.equal(s.bySeverity.high, 1);
  });
});
