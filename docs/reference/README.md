---
slug: reference
description: "Reference for every public API of the @webmcp-agents/* packages, one page per API."
---

# API reference

Reference for every public API of the `@webmcp-agents/*` packages, one page per API. Every page has the same shape:
an import line, a complete example, one table row per option (type, default, what it is for), what it returns, the
edge cases, and where to read more. Each package folder starts with a README that lists its APIs.

New here? Reference is for looking things up. To learn the library, [install it in your framework](<../(get-started)/installation/index.mdx>)
and follow the Build path from [Define a tool](../build/define-a-tool.mdx); [How it works](../concepts/how-it-works.mdx)
explains the ideas behind it.

The packages make an agent's work on a [WebMCP](https://developer.chrome.com/docs/ai/webmcp) page
(`document.modelContext`) visible to the person using it: a ghost cursor, fields typed in place, a parked "confirm"
state. A tool is `execute` plus an optional `target`: nothing is added to your markup for the cursor, which finds controls
by role and accessible name.

## Packages

| Package | What it's for | Docs |
|---|---|---|
| `@webmcp-agents/core` | The visual layer (agent cursor), typed tools (`defineWebTool`), `createWebAgents`, the locator, the tool registry, `executeTool`, tool error codes, WebMCP types, and the polyfill it loads where the browser has no WebMCP | [core](./core/README.md) |
| `@webmcp-agents/react` | `<WebAgentsProvider>` and `useWebTool` to put a catalog and component tools on the page from React | [react](./react/README.md) |
| `@webmcp-agents/tools` | Common tools, ready-made: `get_time`, `get_location`, `get_page`, `go_to`, `go_back`, `scroll_to`, `set_theme` | [tools](./tools/README.md) |
| `@webmcp-agents/polyfill` | Deprecated: the polyfill is `@webmcp-agents/core/polyfill` now, loaded by the provider itself; this package re-exports it | [polyfill](./polyfill/README.md) |
| `@webmcp-agents/devtools` | A panel to see each tool's control, fields and `match`, run and cancel tools, and a timeline of agent calls | [devtools](./devtools/README.md) |
| `@webmcp-agents/chat` | A chat widget, `defineWebAgent` (instructions, tool subsets, sub-agents; `agent.invoke`), `useWebAgent`, the agent adapter contract, a server handler for any frontier model (AI SDK) and a Vite dev plugin | [chat](./chat/README.md) |
| `@webmcp-agents/local-agent` | An on-device agent (Chrome's Prompt API or transformers.js) behind the same adapter contract | [local-agent](./local-agent/README.md) |
| `@webmcp-agents/vercel-api` | The chat handler as a Vercel Function, with origin check, rate limits and a daily budget | [vercel-api](./vercel-api/README.md) |

## Where to start

- **New to the library:** [Installation](<../(get-started)/installation/index.mdx>), then the Build path:
  [Define a tool](../build/define-a-tool.mdx), [Define an agent](../build/define-an-agent.mdx),
  [Add the chat](../build/add-the-chat.mdx).
- **Make a page agent-ready:** write a tool in a component with [`useWebTool`](./react/use-web-tool.md), put the app-wide
  ones in a catalog with [`defineWebTool`](./core/define-web-tool.md) and hand it to
  [`<WebAgentsProvider tools={tools}>`](./react/web-agents-provider.md) (or
  [`createWebAgents`](./core/create-web-agents.md) without React). Add [common tools](./tools/README.md) beside yours.
- **Call a tool or an agent from your own UI:** `tool.invoke(…)` ([`defineWebTool`](./core/define-web-tool.md)),
  `agent.invoke(…)` ([`defineWebAgent`](./chat/define-web-agent.md)), or
  [`useWebAgent`](./chat/use-web-agent.md) for live status.
- **Show what the agent does:** [`installAgentVisuals`](./core/install-agent-visuals.md) (the provider installs it for
  you) and [`cursor.css`](./core/cursor-css.md). Control which element the cursor goes to with a
  [`target`](./core/define-web-tool.md#where-the-cursor-goes) and [`locate`](./core/locate.md).
- **Add the chat:** [`<AgentChat agent={…} />`](./chat/agent-chat.md) (it talks to your
  [`/api/chat`](./chat/create-chat-handler.md) by default; add
  [`createLocalAdapter`](./local-agent/create-local-adapter.md) for an on-device model).
- **When a tool fails:** every failure carries a code (`Error [timeout]: …`), see [tool error codes](./core/tool-error.md).
- **Debug tools:** [`installWebAgentsDevtools`](./devtools/install-web-agents-devtools.md) (Alt+Shift+A): each tool's control, fields and `match`.
- **Deploy the examples:** [Deploy](../more/deploy.md).
