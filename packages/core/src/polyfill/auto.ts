/**
 * Side-effect entry: `import "@webmcp-agents/core/polyfill/auto"` installs the polyfill if the browser has no
 * WebMCP. Only for a page that registers tools without `createWebAgents` or `<WebAgentsProvider>`, which load it
 * themselves.
 */
import { installWebMCPPolyfill } from "./index";

installWebMCPPolyfill();
