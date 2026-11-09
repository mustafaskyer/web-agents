# `errorResult`

Small helpers for tool results and failures. `errorResult` turns a caught error into a coded `isError` result the agent can read and recover from. The others normalise return values, read error text, and tell cancellation apart from failure.

```ts
import { errorResult, errorText, isAbortError, isErrorText, toToolResult } from "@webmcp-agents/core";
```

## Signature

```ts
function errorResult(err: unknown, code?: ToolErrorCode): ModelContextToolResult;

const errorText: (err: unknown) => string;

const isErrorText: (text: string) => boolean;

const isAbortError: (err: unknown) => boolean;

function toToolResult(value: unknown): ModelContextToolResult;
```

## Parameters

| Function | Parameter | Type | Default | Description |
|---|---|---|---|---|
| `errorResult` | `err` | `unknown` | — | What was thrown. |
| `errorResult` | `code` | `ToolErrorCode` | `"failed"` | The code when `err` is not a [`WebToolError`](./web-tool-error.md). |
| `errorText` | `err` | `unknown` | — | What was thrown. |
| `isErrorText` | `text` | `string` | — | A result's text. |
| `isAbortError` | `err` | `unknown` | — | What was thrown. |
| `toToolResult` | `value` | `unknown` | — | What a tool returned. |

## Returns

| Function | Returns |
|---|---|
| `errorResult` | [`toolError(code, errorText(err))`](./tool-error.md), using the `WebToolError`'s code when `err` is one. |
| `errorText` | `err.message` for an `Error`, `String(err)` for anything else. |
| `isErrorText` | `true` for text starting `Error:` or `Error [code]:`. |
| `isAbortError` | `true` when `err.name === "AbortError"`. |
| `toToolResult` | An MCP result: a string becomes text content, an object (not already a result) becomes JSON text, a value with a `content` array passes through, `null` / `undefined` becomes `{ content: [] }`. |

## Example

```ts
import { errorResult, isAbortError, toToolResult } from "@webmcp-agents/core";

async function call(input: unknown, signal: AbortSignal) {
  try {
    return toToolResult(await placeOrder(input, signal)); // "Order #1042 placed." -> text content
  } catch (err) {
    if (isAbortError(err)) throw err; // cancellation must reject, never become a result
    return errorResult(err);          // "Error [failed]: …"
  }
}
```

The ecommerce add-to-cart form uses `errorText` to show and answer the same message:

```ts
import { errorText } from "@webmcp-agents/core";

setError(errorText(err));
return `Error: ${errorText(err)}`;
```

## Notes

- `isErrorText` exists because declarative forms can't set `isError`, so they answer with `Error: …` text. `@webmcp-agents/devtools` treats a result as failed when `isError` is set or `isErrorText` matches its text.
- `toToolResult` applies the same rules the polyfill applies to imperative tools.

## See also

- [`toolError`](./tool-error.md)
- [`WebToolError`](./web-tool-error.md)
- [`executeTool`](./execute-tool.md)
