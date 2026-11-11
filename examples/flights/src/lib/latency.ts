/**
 * Pretend network latency for searches, so the agent cursor is seen working
 * against real loading states. `?latency=0` (tests) or `?latency=1200` sets it
 * for the rest of the session.
 */
const KEY = "skyline:latency";
const DEFAULT_MS = 450;

function read(): number {
  if (typeof location === "undefined") return 0;
  const param = new URLSearchParams(location.search).get("latency");
  if (param !== null && Number.isFinite(Number(param))) sessionStorage.setItem(KEY, param);
  const saved = Number(sessionStorage.getItem(KEY) ?? DEFAULT_MS);
  return Number.isFinite(saved) ? Math.max(0, saved) : DEFAULT_MS;
}

export const LATENCY_MS = read();
