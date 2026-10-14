// tests/invariant.test.ts — tests for the invariant checker + TLA+ specs
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { exactlyOnceSpec, leaderElectionSpec, fifoOrderSpec, getSpec, listSpecs } from "../src/tla/tla-spec.ts";
import { checkInvariants, checkInvariant } from "../src/tla/invariant-checker.ts";

describe("TLA+ specs", () => {
  test("exactlyOnce has NoDuplicates + AllDelivered invariants", () => {
    assert.ok(exactlyOnceSpec.invariants.some(i => i.name === "NoDuplicates"));
    assert.ok(exactlyOnceSpec.invariants.some(i => i.name === "AllDelivered"));
  });
  test("leaderElection has UniqueLeader invariant", () => {
    assert.ok(leaderElectionSpec.invariants.some(i => i.name === "UniqueLeader"));
  });
  test("getSpec finds by name", () => {
    assert.ok(getSpec("ExactlyOnce"));
    assert.ok(getSpec("LeaderElection"));
    assert.equal(getSpec("NonExistent"), undefined);
  });
  test("listSpecs returns all 3", () => {
    assert.equal(listSpecs().length, 3);
  });
});

describe("invariant-checker", () => {
  test("NoDuplicates holds when no duplicates", () => {
    const inv = exactlyOnceSpec.invariants[0];
    assert.ok(checkInvariant(inv, { delivered: ["m1", "m2", "m3"], queue: [] }));
  });
  test("NoDuplicates fails on duplicates", () => {
    const inv = exactlyOnceSpec.invariants[0];
    assert.ok(!checkInvariant(inv, { delivered: ["m1", "m1"], queue: [] }));
  });
  test("UniqueLeader holds with one leader", () => {
    const inv = leaderElectionSpec.invariants[0];
    assert.ok(checkInvariant(inv, { nodes: ["n1","n2"], leader: "n1" }));
  });
  test("UniqueLeader holds with no leader", () => {
    const inv = leaderElectionSpec.invariants[0];
    assert.ok(checkInvariant(inv, { nodes: ["n1"], leader: "" }));
  });
  test("checkInvariants returns violations array", () => {
    const invs = exactlyOnceSpec.invariants;
    const v = checkInvariants(invs, { delivered: ["m1","m1"], queue: [] }, 5);
    assert.ok(v.length > 0);
    assert.equal(v[0].invariant, "NoDuplicates");
    assert.ok(v[0].depth === 5);
  });
  test("checkInvariants returns empty when all hold", () => {
    const v = checkInvariants(exactlyOnceSpec.invariants, { delivered: ["m1","m2"], queue: [] }, 0);
    assert.equal(v.length, 0);
  });
  test("violation has correct severity classification", () => {
    const v = checkInvariants(exactlyOnceSpec.invariants, { delivered: ["m1","m1"], queue: [] }, 0);
    assert.equal(v[0].severity, "high"); // NoDuplicates → high (contains "duplicate")
  });
});
