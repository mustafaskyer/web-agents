/**
 * @web-agents/core: make a WebMCP agent's activity visible on the page.
 *
 *   import { installAgentVisuals } from "@web-agents/core";
 *   import "@web-agents/core/cursor.css";
 */
import "./webmcp"; // global WebMCP types (document.modelContext, SubmitEvent.agentInvoked, …)

export { installAgentVisuals } from "./visuals";
export type { AgentVisuals, AgentVisualsOptions, SpotlightOptions, YieldOptions } from "./visuals";
export { onAgentEvent } from "./events";
export type { AgentEvent } from "./events";
export { UI_HOST_ATTR } from "./user-yield";

// The WebMCP types are global (see ./webmcp). These named aliases let other packages import
// them explicitly, which also pulls the global declarations into their emitted .d.ts.
export type ModelContext = globalThis.ModelContext;
export type ModelContextTool<Args = Record<string, unknown>> = globalThis.ModelContextTool<Args>;
export type ModelContextToolInfo = globalThis.ModelContextToolInfo;
export type ModelContextToolResult = globalThis.ModelContextToolResult;
export type ModelContextExecuteOptions = globalThis.ModelContextExecuteOptions;
export type ToolEvent = globalThis.ToolEvent;
