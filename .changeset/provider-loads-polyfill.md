---
"@webmcp-agents/core": minor
"@webmcp-agents/react": minor
"@webmcp-agents/polyfill": minor
"@webmcp-agents/devtools": patch
"@webmcp-agents/chat": patch
---

The provider loads the WebMCP polyfill itself. `createWebAgents({ polyfill })` and `<WebAgentsProvider polyfill>` take `"auto" | false`, default `"auto"`: where the browser has no `document.modelContext`, they load the polyfill with a dynamic `import()` (a chunk of its own that browsers with WebMCP never download) and install it, in production too, so visitors in Firefox and Safari get the tools, the cursor and the chat. `polyfill: false` never loads it, for a site that wants native WebMCP only.

Registrations wait instead of being dropped: a tool registered through `createWebAgents`, the provider or `useWebTool` (any `registerWebTool`) while the polyfill loads registers once it is there, in order, and unregistering before then cancels it. The cursor installs first. So the "render nothing until the polyfill has loaded" gate goes away: pages render inside the provider on first paint, Server Components included. A tool registered with no polyfill coming still warns once.

- `@webmcp-agents/core`: the polyfill moves in, as `@webmcp-agents/core/polyfill` (`installWebMCPPolyfill`, `PolyfillModelContext`) and the side-effect `@webmcp-agents/core/polyfill/auto`. New `loadWebMCPPolyfill()` (load it only where needed, once per page) and `whenModelContext(listener)` (run once the page has `document.modelContext`), and the `PolyfillOption` type.
- `@webmcp-agents/react`: `<WebAgentsProvider polyfill>`; `useWebTool`'s `registered` and `supported` turn true once the polyfill is there.
- `@webmcp-agents/polyfill`: **deprecated**. It re-exports `@webmcp-agents/core/polyfill` and `/polyfill/auto`, so existing imports keep working. To move on, uninstall it and delete the `import("@webmcp-agents/polyfill/auto")` and the "ready" state that waited for it.
- `@webmcp-agents/devtools` and `@webmcp-agents/chat`: the panel and the chat bind to `document.modelContext` once it exists (`whenModelContext`), so they work when they start before the polyfill.
