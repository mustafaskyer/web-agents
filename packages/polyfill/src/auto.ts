/**
 * @deprecated `createWebAgents` and `<WebAgentsProvider>` load the polyfill themselves where the browser has no WebMCP:
 * remove this import. For a page that registers tools without them, import `@webmcp-agents/core/polyfill/auto`.
 * This entry still installs it, so code written against it keeps working.
 */
import "@webmcp-agents/core/polyfill/auto";
