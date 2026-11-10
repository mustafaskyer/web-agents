/**
 * @deprecated The polyfill lives in `@webmcp-agents/core` now, and `createWebAgents` / `<WebAgentsProvider>` load it
 * themselves where the browser has no WebMCP: remove this package and the `import()` that loaded it. For a page that
 * registers tools without them, import `@webmcp-agents/core/polyfill` instead. This entry re-exports it, so code
 * written against it keeps working.
 *
 *   import { installWebMCPPolyfill } from "@webmcp-agents/core/polyfill";
 */
export { installWebMCPPolyfill, PolyfillModelContext } from "@webmcp-agents/core/polyfill";
