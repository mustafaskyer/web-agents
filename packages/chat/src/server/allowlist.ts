/**
 * The server's own list of tools a page may offer the model (`createChatHandler({ tools })`). The page still sends
 * its live tools with every request (they change as the page changes); the allowlist decides which of them reach the
 * model and, for tools the server knows, what the model is told about them:
 *
 *   - a tool from `defineWebTool` is pinned: its description and input schema come from the server, whatever the
 *     request says (nobody can smuggle a prompt in through a tool description);
 *   - a tool id (a string) is allowed with the page's own description and schema, capped by `chatRequestSchema`:
 *     for tools defined inline in a component (`useWebTool({ name, description, … })`);
 *   - anything else the request lists is dropped. A call the model makes to it anyway answers `Error [unavailable]`.
 *
 * An empty page tool list is always fine: the chat works without tools (the model just talks).
 */
import type { WebTool } from "@webmcp-agents/core";
import type { WebAgent } from "../agent";
import type { ToolDescriptor } from "../types";

/** What `createChatHandler({ tools })` takes: tools from `defineWebTool`, or tool ids, mixed freely. */
export type AllowedTool = string | WebTool;

/** By name: the pinned descriptor, or null for "the page's own". */
export type Allowlist = ReadonlyMap<string, ToolDescriptor | null>;

const isWebTool = (value: unknown): value is WebTool =>
  typeof value === "object" && value !== null && (value as WebTool).kind === "web-tool" && typeof (value as WebTool).id === "string";

/**
 * The allowlist for `tools` plus every tool id a registered agent lists (`defineWebAgent({ tools: [...] })`: the
 * server defined those too). A pinned tool wins over the same id given as a string.
 */
export function buildAllowlist(tools: readonly AllowedTool[], agents: Iterable<WebAgent>): Allowlist {
  const allowed = new Map<string, ToolDescriptor | null>();
  const allow = (name: string) => {
    if (!allowed.has(name)) allowed.set(name, null);
  };
  for (const agent of agents) if (Array.isArray(agent.tools)) for (const name of agent.tools) allow(name);
  for (const tool of tools) {
    if (typeof tool === "string") allow(tool);
    else if (isWebTool(tool)) {
      allowed.set(tool.id, { name: tool.id, description: tool.description, inputSchema: tool.jsonSchema });
    } else throw new TypeError("[web-agents/chat] every entry of `tools` must be a tool id or a tool from defineWebTool().");
  }
  return allowed;
}

/** The page's tools the allowlist lets through, pinned ones replaced by the server's descriptor; page order kept. */
export function applyAllowlist(tools: readonly ToolDescriptor[], allowlist: Allowlist): ToolDescriptor[] {
  const out: ToolDescriptor[] = [];
  for (const tool of tools) {
    if (!allowlist.has(tool.name)) continue;
    out.push(allowlist.get(tool.name) ?? tool);
  }
  return out;
}
