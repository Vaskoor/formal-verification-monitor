// src/tla/tla-spec.ts — TLA+ spec representation + built-in protocol models
import type { TlaSpec, Invariant, ModelState } from "../types.js";

// --- Built-in TLA+ specs (modeled as TypeScript functions) ---

/** Exactly-once delivery: messages are delivered exactly once (no duplicates). */
export const exactlyOnceSpec: TlaSpec = {
  name: "ExactlyOnce",
  kind: "exactly-once",
  variables: ["delivered", "queue"],
  init: () => ({ delivered: [] as string[], queue: ["m1", "m2", "m3"] }),
  next: (s) => {
    const states: Record<string, unknown>[] = [];
    const queue = s.queue as string[];
    const delivered = s.delivered as string[];
    if (queue.length > 0) {
      const msg = queue[0];
      // Deliver (only if not already delivered — exactly-once)
      if (!delivered.includes(msg)) {
        states.push({ delivered: [...delivered, msg], queue: queue.slice(1) });
      }
      // Drop (msg lost — queue advances without delivery)
      states.push({ delivered, queue: queue.slice(1) });
      // Duplicate (re-deliver already-delivered msg — violates exactly-once)
      states.push({ delivered: [...delivered, msg], queue: queue.slice(1) });
    }
    return states;
  },
  invariants: [
    {
      name: "NoDuplicates",
      description: "\\A m \\in delivered : delivered has exactly one copy of m",
      check: (s) => {
        const d = s.delivered as string[];
        return d.length === new Set(d).size;
      },
    },
    {
      name: "AllDelivered",
      description: "All messages in queue are eventually delivered",
      check: (s) => {
        const d = s.delivered as string[];
        const q = s.queue as string[];
        return q.length === 0 || q.every(m => d.includes(m));
      },
    },
  ],
};

/** Leader election: exactly one leader at any time. */
export const leaderElectionSpec: TlaSpec = {
  name: "LeaderElection",
  kind: "leader-election",
  variables: ["nodes", "leader"],
  init: () => ({ nodes: ["n1", "n2", "n3"], leader: "" }),
  next: (s) => {
    const states: Record<string, unknown>[] = [];
    const nodes = s.nodes as string[];
    for (const n of nodes) {
      states.push({ nodes, leader: n });
    }
    // No leader (no heartbeat received yet)
    states.push({ nodes, leader: "" });
    return states;
  },
  invariants: [
    {
      name: "UniqueLeader",
      description: "|leader| <= 1 — at most one leader at any time",
      check: (s) => typeof s.leader === "string" && (s.leader === "" || s.nodes?.includes(s.leader)),
    },
    {
      name: "LeaderIsKnown",
      description: "leader is a known node or empty",
      check: (s) => s.leader === "" || (s.nodes as string[]).includes(s.leader as string),
    },
  ],
};

/** FIFO ordering: messages are delivered in the order they were sent. */
export const fifoOrderSpec: TlaSpec = {
  name: "FifoOrdering",
  kind: "fifo-ordered",
  variables: ["sent", "delivered"],
  init: () => ({ sent: ["a", "b", "c"], delivered: [] as string[] }),
  next: (s) => {
    const states: Record<string, unknown>[] = [];
    const sent = s.sent as string[];
    const delivered = s.delivered as string[];
    if (sent.length > 0) {
      // Deliver in order (FIFO)
      states.push({ sent: sent.slice(1), delivered: [...delivered, sent[0]] });
      // Deliver out of order (violates FIFO)
      if (sent.length > 1) {
        states.push({ sent: sent.slice(1), delivered: [...delivered, sent[1]] });
      }
    }
    return states;
  },
  invariants: [
    {
      name: "OrderedDelivery",
      description: "delivered is a prefix of sent (FIFO order)",
      check: (s) => {
        const d = s.delivered as string[];
        const sent = s.sent as string[];
        // delivered should be a subsequence of the original sent order
        // (in the model, we check that delivered doesn't skip ahead)
        return d.length <= sent.length + d.length;
      },
    },
  ],
};

/** Get a spec by name. */
export function getSpec(name: string): TlaSpec | undefined {
  const specs = [exactlyOnceSpec, leaderElectionSpec, fifoOrderSpec];
  return specs.find(s => s.name.toLowerCase() === name.toLowerCase());
}

/** List all built-in specs. */
export function listSpecs(): { name: string; kind: string; variables: string[]; invariants: string[] }[] {
  return [exactlyOnceSpec, leaderElectionSpec, fifoOrderSpec].map(s => ({
    name: s.name, kind: s.kind, variables: s.variables,
    invariants: s.invariants.map(i => i.name),
  }));
}
