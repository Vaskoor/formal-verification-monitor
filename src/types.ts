// src/types.ts — shared types for the Formal Verification + Runtime Monitoring Platform

export type ProtocolKind = "leader-election" | "consensus" | "exactly-once" | "fifo-ordered" | "custom";
export type Severity = "none" | "low" | "medium" | "high" | "critical";

export interface TlaSpec {
  name: string;
  kind: ProtocolKind;
  variables: string[];
  init: (state: Record<string, unknown>) => Record<string, unknown>;
  next: (state: Record<string, unknown>) => Record<string, unknown>[];
  invariants: Invariant[];
}

export interface Invariant {
  name: string;
  description: string;
  check: (state: Record<string, unknown>) => boolean;
}

export interface ModelState {
  id: string;
  values: Record<string, unknown>;
  depth: number;
  parent?: string;
}

export interface Violation {
  invariant: string;
  state: Record<string, unknown>;
  depth: number;
  detail: string;
  severity: Severity;
}

export interface CheckResult {
  totalStates: number;
  depthBound: number;
  violations: Violation[];
  invariantsChecked: number;
  durationMs: number;
}

export interface CompiledMonitor {
  invariantName: string;
  check: (liveState: Record<string, unknown>) => MonitorAlert;
}

export interface MonitorAlert {
  invariant: string;
  ok: boolean;
  detail: string;
  timestamp: number;
  severity: Severity;
}

export interface ChaosExperiment {
  name: string;
  type: "network-partition" | "clock-skew" | "slow-disk" | "msg-duplication" | "msg-loss";
  durationSec: number;
  finding: string;
  severity: Severity;
  invariantHeld: boolean;
}

export interface PropertyTest {
  name: string;
  generator: () => unknown;
  check: (input: unknown) => boolean;
  runs: number;
  passed: number;
  failed: number;
  counterexample?: unknown;
}
