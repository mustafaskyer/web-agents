# @webmcp-agents/core

Show the person using a page what a WebMCP agent is doing: a ghost cursor that glides to the tool, types the agent's
values, clicks, and parks on a submit button while the browser waits for confirmation. It's driven entirely by WebMCP
lifecycle events, so **tools don't know it exists**, and it gets out of the way the moment the person moves.

The package also holds the tool model the other `@webmcp-agents/*` packages share: `defineWebTool`, a ref-counted tool
registry, error codes for tool results, a cross-browser `executeTool`, and the WebMCP types.

```sh
pnpm add @webmcp-agents/core
```

```ts
import { installAgentVisuals, onAgentEvent } from "@webmcp-agents/core";
import "@webmcp-agents/core/cursor.css";

// Before your app renders, so tools register through it.
const visuals = installAgentVisuals({ spotlight: true });

onAgentEvent((e) => console.debug("[agent]", e)); // start, fill, park, result, error, cancel, yield, resume
```

The one contract: the element a tool acts on carries `toolname="<tool name>"`.

## Docs

- [How it works](https://github.com/mustafaskyer/web-agents/blob/main/docs/concepts/how-it-works.mdx): why tools never know the cursor exists
- [The agent cursor](https://github.com/mustafaskyer/web-agents/blob/main/docs/concepts/agent-cursor.mdx): options, yielding, confirmation, spotlight, styling
- [Tools](https://github.com/mustafaskyer/web-agents/blob/main/docs/concepts/tools.mdx) and [Errors](https://github.com/mustafaskyer/web-agents/blob/main/docs/concepts/errors.mdx)
- [Using it without React](https://github.com/mustafaskyer/web-agents/blob/main/docs/getting-started/without-react.mdx)
- [API reference](https://github.com/mustafaskyer/web-agents/blob/main/docs/reference/core/README.md)
