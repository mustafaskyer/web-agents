import type { AgentVisuals, ToolRegistry } from "@web-agents/core";
import { createContext, useContext } from "react";

/** Runtime control of the agent cursor the provider installed. */
export type WebAgentsVisuals = Pick<AgentVisuals, "setSpotlight" | "setYieldToUser">;

export interface WebAgentsContextValue {
  /** The provider's tool registry (its `tools` catalog). */
  registry: ToolRegistry;
  /** The cursor controls, or null with `visuals={false}`. */
  visuals: WebAgentsVisuals | null;
  /** The pathname routes are matched against. */
  pathname: string;
  /** The latest `context` prop, read when a tool runs. */
  getContext(): unknown;
  /** Install the visuals now if they aren't yet: imperative tools must register after them to be animated. */
  ensureVisuals(): void;
}

export const WebAgentsContext = createContext<WebAgentsContextValue | null>(null);

/** The nearest `<WebAgentsProvider>`'s registry, visuals and pathname. Throws outside one. */
export function useWebAgents(): WebAgentsContextValue {
  const value = useContext(WebAgentsContext);
  if (!value) throw new Error("useWebAgents must be used inside <WebAgentsProvider>");
  return value;
}
