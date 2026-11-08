/**
 * @web-agents/chat: a chat widget whose agent works the live page through its WebMCP tools.
 *
 *   import { AgentChat, createCloudAdapter } from "@web-agents/chat";
 *   import "@web-agents/chat/chat.css";
 *   const cloud = createCloudAdapter();           // POSTs to /api/chat (see @web-agents/chat/server)
 *   <AgentChat adapter={cloud} />
 */
export { AgentChat } from "./components/AgentChat";
export type { AgentChatProps } from "./components/AgentChat";
export { createCloudAdapter } from "./adapter/cloud";
export type { CloudAdapterOptions } from "./adapter/cloud";
export { useAgentSession } from "./session/use-agent-session";
export type { AgentSession, UseAgentSessionOptions } from "./session/use-agent-session";
export { resumable, sessionReducer } from "./session/reducer";
export type { SessionAction, SessionError, SessionState } from "./session/reducer";
export { CANCELLED, isCancelled } from "./shared";
export { callModelContextTool, listToolDescriptors, NAVIGATED, TOOL_TIMEOUT_MS } from "./tools";
export type { CallToolOptions } from "./tools";
export type * from "./types";
