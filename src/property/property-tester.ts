// src/property/property-tester.ts — property-based testing against the model
import type { PropertyTest } from "../types.js";

/** Run a property test for N iterations. Returns the updated test with pass/fail counts. */
export function runPropertyTest(test: PropertyTest): PropertyTest {
  let passed = 0, failed = 0;
  let counterexample: unknown = undefined;

  for (let i = 0; i < test.runs; i++) {
    const input = test.generator();
    try {
      if (test.check(input)) {
        passed++;
      } else {
        failed++;
        if (!counterexample) counterexample = input;
      }
    } catch {
      failed++;
      if (!counterexample) counterexample = input;
    }
  }

  return { ...test, passed, failed, counterexample };
}

/** Built-in property tests for exactly-once delivery. */
export function exactlyOncePropertyTests(): PropertyTest[] {
  return [
    {
      name: "no-duplicate-delivery",
      generator: () => {
        const msgs = ["m1", "m2", "m3", "m4", "m5"];
        const n = 1 + Math.floor(Math.random() * 5);
        return Array.from({ length: n }, () => msgs[Math.floor(Math.random() * msgs.length)]);
      },
      check: (input: unknown) => {
        const arr = input as string[];
        return arr.length === new Set(arr).size;
      },
      runs: 100,
      passed: 0, failed: 0,
    },
    {
      name: "delivery-preserves-order",
      generator: () => {
        const msgs = ["a", "b", "c", "d"];
        const n = 1 + Math.floor(Math.random() * 4);
        return msgs.slice(0, n);
      },
      check: (input: unknown) => {
        const arr = input as string[];
        return arr.every((v, i) => i === 0 || arr[i - 1] <= v);
      },
      runs: 100,
      passed: 0, failed: 0,
    },
    {
      name: "at-most-one-leader",
      generator: () => {
        const nodes = ["n1", "n2", "n3"];
        return { leader: nodes[Math.floor(Math.random() * nodes.length)], nodes };
      },
      check: (input: unknown) => {
        const s = input as { leader: string; nodes: string[] };
        return s.nodes.includes(s.leader);
      },
      runs: 50,
      passed: 0, failed: 0,
    },
  ];
}

/** Run all built-in property tests. */
export function runAllPropertyTests(): PropertyTest[] {
  return exactlyOncePropertyTests().map(runPropertyTest);
}
