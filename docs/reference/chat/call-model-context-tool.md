---
description: "Runs one page tool for an agent through core's executeTool, so the agent cursor plays and Chrome and polyfill differences are absorbed."
---

# `callModelContextTool`

Runs one page tool for an agent through core's `executeTool`, so the agent cursor plays and Chrome and polyfill differences are absorbed. Use it in an adapter that does not use the session: it never throws, every outcome is a result the model can read, and failures carry an error code.

## Import

```ts
import {
  callModelContextTool,
  CANCELLED,
  isCancelled,
  NAVIGATED,
  TOOL_TIMEOUT_MS,
} from "@webmcp-agents/chat";
import type { CallToolOptions } from "@webmcp-agents/chat";
```

## Example

What a custom adapter does for a tool call the model made: run it with the person's Stop signal and a longer limit, and warn unless the person cancelled.

<include meta='title="call-tool.ts"'>/_examples/shared/reference/chat/call-model-context-tool.ts</include>

## Options

`callModelContextTool(call, options?)`. The first argument is the call, the second a `CallToolOptions`.

| Name | Type | Default | Description |
|---|---|---|---|
| `call` | `{ name: string; input: unknown }` | required | The tool's name and its arguments. An input that is not an object is sent as `{}`. |
| `signal` | `AbortSignal` | not set | The person's Stop. Aborting cancels the call, which answers `CANCELLED`. |
| `timeoutMs` | `number` | `TOOL_TIMEOUT_MS` (30 000) | How long the tool may take before the agent gets a `timeout` error and can move on. `0` waits forever. The clock stops for good once the tool waits for the person: see [the time limit](#the-time-limit-and-waitingforuser). |

## Returns

A `Promise<ToolOutput>` (an MCP result: `{ content, isError?, structuredContent? }`):

| Outcome | Result |
|---|---|
| The tool answered | Its result as is. |
| The tool answered `"Error: …"` (or set `isError`) without a code | `isError: true`, the text recoded as `Error [failed]: …`, `structuredContent.error` added; the tool's own `structuredContent` is kept. |
| The tool answered with a code already | Its result with `isError: true`. |
| The page navigated (Chrome resolves such calls to `null`) | The text `NAVIGATED`, not an error. |
| `signal` aborted | `Error [cancelled]: Cancelled by the user.` (`CANCELLED`), `isError: true`. |
| No answer within `timeoutMs` | `Error [timeout]: "<tool>" didn't answer within N s, so it was stopped. …`; the call is cancelled. |
| The page cancelled the call (a navigation, the tool re-registered) | `Error [interrupted]: The page cancelled this call before it finished …` |
| No such tool (`Unknown tool …`) | `Error [unavailable]: Tool "<tool>" is not on this page right now. …` |
| The tool threw | `Error [failed]: <message>` |

Coded failures have `structuredContent.error = { code, retryable }`. See [tool error codes](../core/tool-error.md) for what each code means.

### The time limit and `waitingForUser`

The clock stops for good once the tool waits for the person, since they may take their time. That is detected two ways: a core `park` event for this tool (a confirm, or [`waitingForUser()`](../core/waiting-for-user.md)), or, when the timer fires, a declarative `form[toolname="<tool>"]` on the page whose submit is paused for the click (`[data-tool-submit-active]` or `:tool-submit-active`). The `park` event needs the visuals installed, so the page check covers pages without them.

### `CANCELLED` and `isCancelled`

`CANCELLED` is `"Error [cancelled]: Cancelled by the user."`, what a call the user stopped answers. `isCancelled(text)` is true for text starting with `Error [cancelled]`, or with `Cancelled by the user` (conversations saved before codes existed). The session shows such calls as cancelled, not failed.

### `NAVIGATED` and `TOOL_TIMEOUT_MS`

`NAVIGATED` is "The page navigated away while this tool ran, so its result is unknown. Check the page before retrying." `TOOL_TIMEOUT_MS` is `30_000`.

## Notes

- Only the person's Stop answers `cancelled`. A call the page cancelled is `interrupted`, so the agent checks the page and carries on instead of stopping.
- A `timeout` stops the call, but the tool may or may not have done its work; the message says to check the page.
- [`useAgentSession`](./use-agent-session.md) passes its own signal; you rarely need this directly unless you write an adapter that does not use the widget.

## See also

- [Add the chat](../../build/add-the-chat.mdx)
- [`listToolDescriptors`](./list-tool-descriptors.md)
- [`AgentRunRequest.callTool`](./adapter-types.md#agentrunrequest), the call an adapter receives
- [`executeTool`](../core/execute-tool.md) and [tool error codes](../core/tool-error.md)
