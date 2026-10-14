// src/tla/invariant-checker.ts — check invariants against model states
import type { Invariant, Violation, Severity } from "../types.js";

/** Check all invariants against a single state. Returns violations found. */
export function checkInvariants(
  invariants: Invariant[],
  state: Record<string, unknown>,
  depth: number,
): Violation[] {
  const violations: Violation[] = [];
  for (const inv of invariants) {
    try {
      if (!inv.check(state)) {
        violations.push({
          invariant: inv.name,
          state: { ...state },
          depth,
          detail: `Invariant "${inv.name}" violated at depth ${depth}: ${inv.description}`,
          severity: classifyViolation(inv, state),
        });
      }
    } catch (e) {
      violations.push({
        invariant: inv.name,
        state: { ...state },
        depth,
        detail: `Invariant "${inv.name}" threw: ${(e as Error).message}`,
        severity: "high",
      });
    }
  }
  return violations;
}

/** Classify the severity of a violation based on the invariant name. */
function classifyViolation(inv: Invariant, _state: Record<string, unknown>): Severity {
  const name = inv.name.toLowerCase();
  if (name.includes("unique") || name.includes("exactly") || name.includes("consensus")) return "critical";
  if (name.includes("order") || name.includes("fifo")) return "high";
  if (name.includes("duplicate")) return "high";
  return "medium";
}

/** Check a single invariant (convenience function). */
export function checkInvariant(inv: Invariant, state: Record<string, unknown>): boolean {
  try { return inv.check(state); } catch { return false; }
}
