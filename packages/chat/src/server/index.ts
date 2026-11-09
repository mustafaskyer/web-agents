/**
 * @webmcp-agents/chat/server: the `/api/chat` handler (Node 22+, Vercel functions, `vite dev`).
 *
 *   export default { fetch: createChatHandler() };          // or: export const POST = createChatHandler();
 */
export { createChatHandler, DEFAULT_MODEL } from "./handler";
export type { ChatHandlerOptions, Effort } from "./handler";
export { buildSystemPrompt, DEFAULT_SYSTEM_PROMPT } from "./system-prompt";
export { chatRequestSchema, LIMITS } from "./validate";
export type { ChatRequest } from "./validate";
