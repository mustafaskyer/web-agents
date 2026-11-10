/**
 * @webmcp-agents/devtools: see the WebMCP tools on a page, run them from a
 * generated form, and watch every call (yours or an agent's).
 *
 *   import { installWebAgentsDevtools } from "@webmcp-agents/devtools";
 *   if (import.meta.env.DEV) installWebAgentsDevtools({ visuals });
 *
 * React apps: `@webmcp-agents/devtools/react` (`<WebAgentsDevtools />`, TanStack plugin).
 */
import { installAgentVisuals } from "@webmcp-agents/core";
import type { DevtoolsVisuals } from "./store";
import { type DevtoolsOptions, installWebAgentsDevtools } from "./vanilla";

export { installWebAgentsDevtools };
export type { DevtoolsOptions };
export { createDevtoolsStore, DEFAULT_SETTINGS } from "./store";
export type {
  CallFill,
  CallRecord,
  CallStatus,
  DevtoolsSettings,
  DevtoolsState,
  DevtoolsStore,
  DevtoolsStoreOptions,
  DevtoolsTab,
  DevtoolsVisuals,
  TimelineMarker,
  ToolView,
} from "./store";
export type { ControlView, FieldView, FlagView } from "./inspect";
export { bridgeStoreToEventClient, webAgentsEventClient } from "./event-client";
export type { WebAgentsEvents } from "./event-client";
export { SchemaForm } from "./schema-form/schema-form";
export type { SchemaFormProps } from "./schema-form/schema-form";
export { defaultValueFor } from "./schema-form/defaults";
export { parseSchema } from "./schema";
export type { SchemaNode } from "./schema";
export { toAgentInvokeCode, toAgentRunCode, toExecuteToolCode } from "./copy-as-code";

/** @deprecated Options of the old agent console; use `installWebAgentsDevtools`. */
export interface AgentConsoleOptions {
  /** Drives the Spotlight switch. */
  spotlight?: { initial: boolean; set(on: boolean): void };
}

/** @deprecated The old agent console. Installs the devtools panel instead (open on load). */
export function installAgentConsole({ spotlight }: AgentConsoleOptions = {}): () => void {
  // Another handle on the page's visuals applies the option and releases at once (installs are ref-counted).
  const visuals: DevtoolsVisuals | null = spotlight
    ? {
        setSpotlight: (value) => spotlight.set(value !== false),
        setYieldToUser: (value) => installAgentVisuals({ yieldToUser: value }).destroy(),
      }
    : null;
  return installWebAgentsDevtools({ visuals, initialOpen: true, initialSettings: { spotlight: spotlight?.initial } });
}
