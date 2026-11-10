---
description: "Small helpers for tool results and failures."
---

# `errorResult`

Small helpers for tool results and failures. `errorResult` turns a caught error into a coded `isError` result the agent can read and recover from; the others normalise return values, read error text, and tell cancellation apart from failure. Reach for them when you write the glue between your own code and `document.modelContext`; a tool made with `defineWebTool` already does all of this.

## Import

```ts
import {
  errorResult,
  errorText,
  isAbortError,
  isErrorText,
  toToolResult,
} from "@webmcp-agents/core";
```

## Example

A call wrapper: a result becomes MCP content, a failure becomes a coded error, and a cancellation stays a rejection.

<include meta='title="call-wrapper.ts"'>/_examples/shared/reference/core/error-result.ts</include>

A form that shows and answers with the same message uses `errorText`:

```ts
import { errorText } from "@webmcp-agents/core";

function failed(err: unknown, setError: (text: string) => void) {
  setError(errorText(err)); // on the page
  return `Error: ${errorText(err)}`; // to the agent
}
```

## Options

Each helper takes only positional arguments.

| Name | Type | Default | Description |
|---|---|---|---|
| `errorResult(err, code?)` | `(err: unknown, code?: ToolErrorCode) => ModelContextToolResult` | `code`: `"failed"` | A failure the agent can read. `err` is what was thrown; `code` is used when `err` is not a [`WebToolError`](./web-tool-error.md), which brings its own. |
| `errorText(err)` | `(err: unknown) => string` | required | The message of what was thrown: `err.message` for an `Error`, `String(err)` for anything else. |
| `isErrorText(text)` | `(text: string) => boolean` | required | Whether a result's text reads as a failure: it starts with `Error:` or `Error [code]:`. |
| `isAbortError(err)` | `(err: unknown) => boolean` | required | Whether what was thrown is a cancellation (`err.name === "AbortError"`). |
| `toToolResult(value)` | `(value: unknown) => ModelContextToolResult` | required | Normalise what a tool returned into an MCP result. |

## Returns

| Function | Returns |
|---|---|
| `errorResult` | [`toolError(code, errorText(err))`](./tool-error.md): `{ content: [{ type: "text", text: "Error [code]: …" }], isError: true }`, using the `WebToolError`'s code when `err` is one. |
| `errorText` | A string. |
| `isErrorText` | A boolean. |
| `isAbortError` | A boolean. |
| `toToolResult` | An MCP result: a string becomes text content, an object (not already a result) becomes JSON text, a value with a `content` array passes through, `null` or `undefined` becomes `{ content: [] }`. |

## Notes

- `isErrorText` exists because declarative forms cannot set `isError`, so they answer with `Error: …` text. `@webmcp-agents/devtools` treats a result as failed when `isError` is set or `isErrorText` matches its text.
- `toToolResult` applies the same rules the polyfill applies to imperative tools.
- Cancellation must propagate as a rejection: check `isAbortError` before turning an error into a result.

## See also

- [Errors](../../concepts/errors.mdx)
- [`toolError`](./tool-error.md)
- [`WebToolError`](./web-tool-error.md)
- [`executeTool`](./execute-tool.md)
