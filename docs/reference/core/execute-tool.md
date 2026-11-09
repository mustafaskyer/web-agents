# `executeTool`

Calls a page's WebMCP tool the way an agent would, from library UI such as devtools or a chat widget. It absorbs what differs between Chrome builds and the polyfill: the argument shape, string versus object results, navigation and cancellation.

```ts
import { executeTool, normalizeToolResult } from "@webmcp-agents/core";
```

## Signature

```ts
function executeTool(
  name: string,
  args: Record<string, unknown>,
  options?: ExecuteToolOptions,
): Promise<ModelContextToolResult | null>;

interface ExecuteToolOptions {
  signal?: AbortSignal;
}

function normalizeToolResult(res: ModelContextToolResult | string): ModelContextToolResult;
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | — | The tool name, looked up in `document.modelContext.getTools()`. |
| `args` | `Record<string, unknown>` | — | The tool's arguments, as an object. |
| `signal` | `AbortSignal` | — | Aborting cancels the call (passed on to `modelContext.executeTool`), and the promise rejects with an `AbortError`. |

## Returns

`executeTool` resolves to the tool's result as a `ModelContextToolResult`, or `null` when the call navigated the page (Chrome resolves nothing then). It rejects when:

- `document.modelContext` is missing (`document.modelContext is not available. Import @webmcp-agents/polyfill/auto in development.`),
- the tool isn't registered (`Unknown tool "<name>"`),
- `signal` aborts (an `AbortError`).

`normalizeToolResult` turns either result shape into a `ModelContextToolResult`. An object passes through. A string is parsed as JSON and normalised with [`toToolResult`](./error-result.md); a string that isn't JSON becomes a text result.

## Example

A tool runner, like the one in `@webmcp-agents/devtools`:

```ts
import { executeTool, isErrorText, toolErrorCode } from "@webmcp-agents/core";

const controller = new AbortController();
const result = await executeTool("add_to_cart_mug-01", { qty: 3 }, { signal: controller.signal });

if (result === null) {
  console.log("The call navigated the page.");
} else if (result.isError || toolErrorCode(result)) {
  console.warn(result.content[0]?.text);
}

// Cancel button
controller.abort();
```

## Notes

- Native `executeTool` takes the tool object from `getTools()`. Chrome 156 wants the args as an object, Chrome 150 as a JSON string. `executeTool` tries the last shape that worked and falls back on the argument-validation error; both errors are thrown before the tool runs, so the retry is safe.
- On abort, the promise rejects at once, whatever a given build does with the signal.
- Use it instead of calling `document.modelContext.executeTool` directly from library UI.

## See also

- [`toolError`](./tool-error.md)
- [`errorResult`](./error-result.md)
- [WebMCP types](./webmcp-types.md)
- [`isWebMCPAvailable`](./is-webmcp-available.md)
