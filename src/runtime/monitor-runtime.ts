// src/runtime/monitor-runtime.ts — runtime monitor that checks live system state
import type { CompiledMonitor, MonitorAlert } from "../types.js";

const monitors: CompiledMonitor[] = [];
let alertHistory: MonitorAlert[] = [];
const MAX_HISTORY = 1000;

/** Register a compiled monitor. */
export function registerMonitor(monitor: CompiledMonitor): void {
  monitors.push(monitor);
}

/** Check live state against all registered monitors. */
export function checkLive(liveState: Record<string, unknown>): MonitorAlert[] {
  const alerts: MonitorAlert[] = [];
  for (const m of monitors) {
    const alert = m.check(liveState);
    if (!alert.ok) {
      alerts.push(alert);
      alertHistory.push(alert);
      if (alertHistory.length > MAX_HISTORY) alertHistory = alertHistory.slice(-MAX_HISTORY);
    }
  }
  return alerts;
}

/** Get all active alerts. */
export function getAlerts(): MonitorAlert[] {
  return [...alertHistory];
}

/** Clear alert history. */
export function clearAlerts(): void {
  alertHistory = [];
}

/** Get monitor stats. */
export function stats(): {
  monitorCount: number;
  alertCount: number;
  healthy: boolean;
} {
  return {
    monitorCount: monitors.length,
    alertCount: alertHistory.filter(a => !a.ok).length,
    healthy: alertHistory.filter(a => a.severity === "critical").length === 0,
  };
}

/** Clear all monitors. */
export function reset(): void {
  monitors.length = 0;
  alertHistory = [];
}
