---
description: "Calls a page's WebMCP tool by name the way an agent would, from library UI such as devtools or a chat widget."
---

# `executeTool`

Calls a page's WebMCP tool by name the way an agent would, from library UI such as devtools or a chat widget. It absorbs what differs between Chrome builds and the polyfill: the argument shape, string versus object results, navigation and cancellation. Where you have the tool itself, prefer its `invoke`.

## Import

```ts
import { executeTool, normalizeToolResult } from "@webmcp-agents/core";
import type { ExecuteToolOptions } from "@webmcp-agents/core";
```

## Example

A tool runner with a Cancel button, like the one in `@webmcp-agents/devtools`:

<include meta='title="run-a-tool.ts"'>/_examples/shared/reference/core/execute-tool.ts</include>

## Options

`executeTool(name, args, options?)`.

| Name | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | required | The tool's name, looked up in `document.modelContext.getTools()`, e.g. `"add_to_cart_mug-01"`. |
| `args` | `Record<string, unknown>` | required | The tool's arguments, as an object. They are validated by the tool, not here. |
| `signal` | `AbortSignal` | not said | Aborting cancels the call (it is passed on to `modelContext.executeTool`), and the promise rejects with an `AbortError` at once. Option of `ExecuteToolOptions`. |

## Returns

`executeTool` resolves to the tool's result as a `ModelContextToolResult`, or `null` when the call navigated the page (Chrome resolves nothing then). It rejects when:

- `document.modelContext` is missing (`document.modelContext is not available: no WebMCP in this browser, and no polyfill loaded.`),
- the tool is not registered (`Unknown tool "<name>"`),
- `signal` aborts (an `AbortError`).

A tool that fails does not reject: it resolves to a result with `isError` (and a code, see [`toolErrorCode`](./tool-error.md)).

### `normalizeToolResult(res)`

Turns either result shape into a `ModelContextToolResult`: an object passes through, a string is parsed as JSON and normalised with [`toToolResult`](./error-result.md), and a string that is not JSON becomes a text result.

## Notes

- Native `executeTool` takes the tool object from `getTools()`. Chrome 156 wants the args as an object, Chrome 150 as a JSON string. `executeTool` tries the last shape that worked and falls back on the argument-validation error; both errors are thrown before the tool runs, so the retry is safe.
- On abort, the promise rejects at once, whatever a given build does with the signal.
- Use it instead of calling `document.modelContext.executeTool` directly from library UI.
- A tool's own `invoke` (see [`defineWebTool`](./define-web-tool.md)) is built on it and also hands back the value `execute` returned: prefer `tool.invoke(input)` where you have the tool, `executeTool` where you only have a name.

## See also

- [Call a tool](../../build/call-a-tool.mdx), the page that teaches it
- [`toolError`](./tool-error.md)
- [`errorResult`](./error-result.md)
- [WebMCP types](./webmcp-types.md)
- [`isWebMCPAvailable`](./is-webmcp-available.md)
