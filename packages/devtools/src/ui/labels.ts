import type { CallRecord, CallStatus } from "../store";

/** What each call status reads as, in the timeline and the runner. */
export const STATUS_LABEL: Record<CallStatus, string> = {
  running: "Running",
  waiting: "Waiting for you",
  ok: "Done",
  error: "Failed",
  cancelled: "Cancelled",
};

/** "840 ms", "2.4 s", "1 m 12 s". */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)} m ${Math.round((ms % 60_000) / 1000)} s`;
}

/**
 * A call's status line. `mayConfirm`: the tool is a confirm form and no cursor reports the pause
 * (no visuals), so a long "Running" may really be the browser waiting for the user's click.
 */
export function statusText(call: CallRecord, mayConfirm = false): string {
  if (call.status === "waiting" && call.prompt) return `${STATUS_LABEL.waiting} · ${call.prompt}`;
  if (call.status === "running" && mayConfirm) return "Running · may be waiting for your click on the page";
  return STATUS_LABEL[call.status];
}
