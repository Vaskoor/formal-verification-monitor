// src/config.ts — platform configuration
export const PLATFORM_CONFIG = {
  version: "1.0.0",
  defaultPort: 4303,
  maxStates: Number(process.env.MAX_STATES || "1000000"),
  maxDepth: Number(process.env.MAX_DEPTH || "100"),
  chaosEnabled: process.env.CHAOS !== "false",
  monitorIntervalMs: Number(process.env.MONITOR_INTERVAL || "1000"),
};
