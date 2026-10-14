// src/checker/model-checker.ts — BFS state-space exploration + violation detection
import type { TlaSpec, ModelState, Violation, CheckResult } from "../types.js";
import { checkInvariants } from "../tla/invariant-checker.js";
import { PLATFORM_CONFIG } from "../config.js";

/** State key for dedup (JSON-serialized values, sorted keys). */
function stateKey(values: Record<string, unknown>): string {
  const sorted = Object.keys(values).sort();
  const pairs = sorted.map(k => `${k}=${JSON.stringify(values[k])}`);
  return pairs.join("|");
}

/** Explore the state space via BFS, checking invariants at every state. */
export function modelCheck(
  spec: TlaSpec,
  maxDepth = PLATFORM_CONFIG.maxDepth,
  maxStates = PLATFORM_CONFIG.maxStates,
): CheckResult {
  const t0 = Date.now();
  const visited = new Set<string>();
  const violations: Violation[] = [];
  const queue: ModelState[] = [];
  let totalStates = 0;

  // Initial state
  const initValues = spec.init({});
  const initState: ModelState = { id: "init", values: initValues, depth: 0 };
  queue.push(initState);

  while (queue.length > 0 && totalStates < maxStates) {
    const current = queue.shift()!;
    const key = stateKey(current.values);

    if (visited.has(key)) continue;
    visited.add(key);
    totalStates++;

    // Check invariants at this state
    const v = checkInvariants(spec.invariants, current.values, current.depth);
    if (v.length > 0) {
      violations.push(...v);
      // Continue exploring (find ALL violations, not just the first)
    }

    if (current.depth >= maxDepth) continue;

    // Generate successor states via the Next action
    const successors = spec.next(current.values);
    for (const succValues of successors) {
      const succKey = stateKey(succValues);
      if (!visited.has(succKey)) {
        queue.push({
          id: `s${totalStates}-${succKey.slice(0, 8)}`,
          values: succValues,
          depth: current.depth + 1,
          parent: current.id,
        });
      }
    }
  }

  return {
    totalStates,
    depthBound: maxDepth,
    violations,
    invariantsChecked: spec.invariants.length,
    durationMs: Date.now() - t0,
  };
}

/** Summarize a check result for the dashboard. */
export function summarizeCheck(result: CheckResult): {
  totalStates: number;
  violations: number;
  balanced: boolean;
  bySeverity: Record<string, number>;
} {
  const bySeverity: Record<string, number> = {};
  for (const v of result.violations) bySeverity[v.severity] = (bySeverity[v.severity] || 0) + 1;
  return {
    totalStates: result.totalStates,
    violations: result.violations.length,
    balanced: result.violations.length === 0,
    bySeverity,
  };
}
