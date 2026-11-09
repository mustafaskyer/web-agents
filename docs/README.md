---
slug: index
sidebar:
  order: 0
---

# web-agents API docs

Reference for every public API of the `@webmcp-agents/*` packages, one file per API. Each package folder starts with a
README that lists its files.

The packages make an agent's work on a [WebMCP](https://developer.chrome.com/docs/ai/webmcp) page
(`document.modelContext`) visible to the person using it: a ghost cursor, fields typed in place, a parked "confirm"
state. The tools themselves never know the visual layer exists.

## Packages

| Package | What it's for | Docs |
|---|---|---|
| `@webmcp-agents/core` | The visual layer (agent cursor), typed tools (`defineWebTool`), the tool registry, `executeTool`, tool error codes, WebMCP types | [core](./core/README.md) |
| `@webmcp-agents/react` | `<WebAgentsProvider>` and hooks to register, enable and answer tools from React | [react](./react/README.md) |
| `@webmcp-agents/polyfill` | `document.modelContext` for browsers without WebMCP, including declarative forms (dev) | [polyfill](./polyfill/README.md) |
| `@webmcp-agents/devtools` | A panel to see, run and cancel the page's tools, and a timeline of agent calls | [devtools](./devtools/README.md) |
| `@webmcp-agents/chat` | A chat widget, the agent adapter contract, a Claude server handler and a Vite dev plugin | [chat](./chat/README.md) |
| `@webmcp-agents/local-agent` | An on-device agent (Chrome's Prompt API or transformers.js) behind the same adapter contract | [local-agent](./local-agent/README.md) |
| `@webmcp-agents/vercel-api` | The chat handler as a Vercel Function, with origin check, rate limits and a daily budget | [vercel-api](./vercel-api/README.md) |

## Where to start

- **Make a page agent-ready:** write tools with [`defineWebTool`](./core/define-web-tool.md) or declarative forms
  ([JSX attributes](./react/jsx-attributes.md)), and register them with
  [`<WebAgentsProvider>`](./react/web-agents-provider.md).
- **Show what the agent does:** [`installAgentVisuals`](./core/install-agent-visuals.md) (the provider installs it for
  you) and [`cursor.css`](./core/cursor-css.md).
- **Add a chat:** [`<AgentChat>`](./chat/agent-chat.md) with [`createCloudAdapter`](./chat/create-cloud-adapter.md)
  (Claude, needs [`/api/chat`](./chat/create-chat-handler.md)) and/or
  [`createLocalAdapter`](./local-agent/create-local-adapter.md) (on-device).
- **When a tool fails:** every failure carries a code (`Error [timeout]: …`), see [tool error codes](./core/tool-error.md).
- **Debug tools:** [`installWebAgentsDevtools`](./devtools/install-web-agents-devtools.md) (Alt+Shift+A).
- **Deploy the examples:** [deploy.md](./deploy.md).
