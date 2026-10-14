// src/runtime/monitor-compiler.ts — compile invariants into runtime monitor functions
import type { Invariant, CompiledMonitor, MonitorAlert, Severity } from "../types.js";

/** Compile an invariant into a runtime monitor function. */
export function compileMonitor(inv: Invariant): CompiledMonitor {
  return {
    invariantName: inv.name,
    check: (liveState: Record<string, unknown>): MonitorAlert => {
      try {
        const ok = inv.check(liveState);
        return {
          invariant: inv.name,
          ok,
          detail: ok ? `${inv.name} holds` : `${inv.name} VIOLATED — ${inv.description}`,
          timestamp: Date.now(),
          severity: ok ? "none" : classifySeverity(inv.name),
        };
      } catch (e) {
        return {
          invariant: inv.name,
          ok: false,
          detail: `${inv.name} monitor error: ${(e as Error).message}`,
          timestamp: Date.now(),
          severity: "high",
        };
      }
    },
  };
}

/** Compile all invariants into a monitor set. */
export function compileAll(invariants: Invariant[]): CompiledMonitor[] {
  return invariants.map(compileMonitor);
}

function classifySeverity(name: string): Severity {
  const n = name.toLowerCase();
  if (n.includes("unique") || n.includes("exactly") || n.includes("consensus")) return "critical";
  if (n.includes("order") || n.includes("fifo") || n.includes("duplicate")) return "high";
  return "medium";
}
