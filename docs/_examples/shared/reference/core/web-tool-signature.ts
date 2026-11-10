import { type WebTool, webToolSignature } from "@webmcp-agents/core";

let registered: string | undefined;

/** Re-register only when what the agent sees changed. */
export function needsReregistration(next: WebTool): boolean {
  const signature = webToolSignature(next);
  const changed = signature !== registered;
  registered = signature;
  return changed;
}
