// src/chaos/chaos-runner.ts — Jepsen-style chaos experiments
import type { ChaosExperiment, Invariant } from "../types.js";

/** Run a chaos experiment against a set of invariants. */
export function runChaos(
  invariants: Invariant[],
  experiment: Omit<ChaosExperiment, "finding" | "severity" | "invariantHeld">,
): ChaosExperiment {
  // Simulate the chaos scenario's effect on the system state
  const chaoticState = simulateChaos(experiment.type);

  // Check if invariants still hold under the chaos scenario
  let allHold = true;
  let violatedInv = "";
  for (const inv of invariants) {
    try {
      if (!inv.check(chaoticState)) {
        allHold = false;
        violatedInv = inv.name;
        break;
      }
    } catch { allHold = false; violatedInv = inv.name; break; }
  }

  const finding = allHold
    ? `All invariants held under ${experiment.type}`
    : `Invariant "${violatedInv}" violated under ${experiment.type}`;

  return {
    ...experiment,
    finding,
    severity: allHold ? "none" : experiment.type === "network-partition" ? "critical" : "high",
    invariantHeld: allHold,
  };
}

/** Simulate the effect of a chaos type on system state. */
function simulateChaos(type: ChaosExperiment["type"]): Record<string, unknown> {
  switch (type) {
    case "network-partition":
      // Split-brain: two leaders
      return { nodes: ["n1", "n2", "n3"], leader: "n1", partitioned: true };
    case "clock-skew":
      // Out-of-order messages due to clock drift
      return { sent: ["a", "b", "c"], delivered: ["c", "a"], clockDrift: 500 };
    case "slow-disk":
      // Stale reads due to slow disk
      return { nodes: ["n1"], leader: "n1", staleRead: true };
    case "msg-duplication":
      // Re-delivered message
      return { delivered: ["m1", "m1", "m2"], queue: [] };
    case "msg-loss":
      // Lost message
      return { delivered: ["m1"], queue: [], lost: ["m2"] };
    default:
      return {};
  }
}

/** Run the default chaos suite. */
export function runDefaultSuite(invariants: Invariant[]): ChaosExperiment[] {
  const experiments: Omit<ChaosExperiment, "finding" | "severity" | "invariantHeld">[] = [
    { name: "Network Partition (3 nodes)", type: "network-partition", durationSec: 30 },
    { name: "Clock Skew (±500ms)", type: "clock-skew", durationSec: 60 },
    { name: "Slow Disk (5s latency)", type: "slow-disk", durationSec: 30 },
    { name: "Message Duplication (2%)", type: "msg-duplication", durationSec: 45 },
    { name: "Message Loss (1%)", type: "msg-loss", durationSec: 45 },
  ];
  return experiments.map(e => runChaos(invariants, e));
}
