# `callModelContextTool`

Runs one page tool for an agent, through core's `executeTool`, so the agent cursor plays and Chrome and polyfill
differences are absorbed. It never throws: every outcome is a result the model can read, and failures carry an error
code.

```ts
import { callModelContextTool, CANCELLED, isCancelled, NAVIGATED, TOOL_TIMEOUT_MS } from "@web-agents/chat";
import type { CallToolOptions } from "@web-agents/chat";
```

## Signature

```ts
function callModelContextTool(
  call: { name: string; input: unknown },
  options?: CallToolOptions,
): Promise<ToolOutput>;

interface CallToolOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

const TOOL_TIMEOUT_MS = 30_000;
const NAVIGATED: string;
const CANCELLED = "Error [cancelled]: Cancelled by the user.";
function isCancelled(text: string): boolean;
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `call.name` | `string` | — | The tool's name. |
| `call.input` | `unknown` | — | Arguments. Anything that isn't an object is sent as `{}`. |
| `options.signal` | `AbortSignal` | — | The person's Stop. Aborting cancels the call, which answers `CANCELLED`. |
| `options.timeoutMs` | `number` | `TOOL_TIMEOUT_MS` (30 000) | How long the tool may take. `0` waits forever. |

## Returns

A `Promise<ToolOutput>` (an MCP result, `{ content, isError?, structuredContent? }`):

| Outcome | Result |
|---|---|
| The tool answered | Its result as is. |
| The tool answered `"Error: …"` (or set `isError`) without a code | `isError: true`, text recoded as `Error [failed]: …`, `structuredContent.error` added; the tool's own `structuredContent` is kept. |
| The tool answered with a code already | Its result with `isError: true`. |
| The page navigated (Chrome resolves such calls to `null`) | Text `NAVIGATED`, not an error. |
| `signal` aborted | `Error [cancelled]: Cancelled by the user.` (`CANCELLED`), `isError: true`. |
| No answer within `timeoutMs` | `Error [timeout]: "<tool>" didn't answer within N s, so it was stopped. …` The call is cancelled. |
| The page cancelled the call (a navigation, the tool re-registered) | `Error [interrupted]: The page cancelled this call before it finished …` |
| No such tool (`Unknown tool …`) | `Error [unavailable]: Tool "<tool>" is not on this page right now. …` |
| The tool threw | `Error [failed]: <message>` |

Coded failures have `structuredContent.error = { code, retryable }`. See [tool error codes](../core/tool-error.md) for
what each code means.

## The time limit and `waitingForUser`

The clock stops for good once the tool waits for the person, since they may take their time. That is detected two
ways: a core `park` event for this tool (a confirm, or `waitingForUser()` from `@web-agents/core`), or, when the timer
fires, a declarative `form[toolname="<tool>"]` on the page whose submit is paused for the click
(`[data-tool-submit-active]` or `:tool-submit-active`). The `park` event needs the visuals installed, so the page check
covers pages without them.

## `CANCELLED` and `isCancelled`

`CANCELLED` is what a call the user stopped answers. `isCancelled(text)` is true for text starting with
`Error [cancelled]`, or with `Cancelled by the user` (conversations saved before codes existed). The session shows
such calls as cancelled, not failed.

## `NAVIGATED`

"The page navigated away while this tool ran, so its result is unknown. Check the page before retrying."

## Example

```ts
// a custom adapter's tool step
const output = await callModelContextTool(
  { name: "add_to_cart", input: { slug: "trail-cap", qty: 1 } },
  { signal: req.signal, timeoutMs: 60_000 },
);
if (output.isError) console.warn(output.content[0]);
```

## Notes

- Only the person's Stop answers `cancelled`. A call the page cancelled is `interrupted`, so the agent checks the page
  and carries on instead of stopping.
- A `timeout` stops the call, but the tool may or may not have done its work; the message says to check the page.
- `useAgentSession` passes its own signal; you rarely need this directly unless you write an adapter that doesn't use
  the widget.

## See also

- [`listToolDescriptors`](./list-tool-descriptors.md)
- [`AgentRunRequest.callTool`](./adapter-types.md#agentrunrequest)
- [Tool error codes](../core/tool-error.md)
