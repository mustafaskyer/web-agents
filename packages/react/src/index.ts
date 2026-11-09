/**
 * @webmcp-agents/react: WebMCP tools for React apps.
 *
 *   <WebAgentsProvider tools={catalog} global={["get_cart"]} routes={{ "/orders": ["list_orders"] }} context={cart}>
 *   useEnableTools(["remove_promo"]);  <EnableTools names={["remove_promo"]} />
 *   useWebTool(tool, { enabled });     useToolAnswer();     useAgentEvents(listener);
 */
export type {} from "./jsx";

export { WebAgentsProvider } from "./provider";
export type { WebAgentsProviderProps } from "./provider";
export { useOptionalWebAgents, useWebAgents } from "./context";
export type { WebAgentsContextValue, WebAgentsVisuals } from "./context";
export { EnableTools, useEnableTools } from "./use-enable-tools";
export { useEnabledTools } from "./use-enabled-tools";
export { useWebTool } from "./use-web-tool";
export type { UseWebToolOptions, WebToolState } from "./use-web-tool";
export { useAnswerGrace, useToolAnswer } from "./use-tool-answer";
export type { ToolAnswer } from "./use-tool-answer";
export { useAgentEvents } from "./use-agent-events";
export { usePathname } from "./use-pathname";

// The common path in one import.
export { defineWebTool, waitingForUser, WebToolError } from "@webmcp-agents/core";
export type { ToolErrorCode } from "@webmcp-agents/core";
export type { Register, WebTool, WebToolConfig, WebToolContext } from "@webmcp-agents/core";
