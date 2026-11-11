---
description: "Builds a failed tool result that says why with one code, in the text a model reads and in structuredContent.error."
---

# `toolError`

Builds a failed tool result that says why with one code, twice: in the text every model reads (`Error [invalid_input]: …`) and in `structuredContent.error` (`{ code, retryable }`) for browsers, devtools and code that branches on it. Reach for it when you answer a call yourself, for example in a [`registerTool`](./register-web-tool.md) handler of your own; inside a `WebTool` you throw a [`WebToolError`](./web-tool-error.md) instead. `toolErrorCode` reads the code back, and `RETRYABLE` says which codes are worth retrying.

## Import

```ts
import { RETRYABLE, toolError, toolErrorCode } from "@webmcp-agents/core";
import type { ToolErrorCode } from "@webmcp-agents/core";
```

## Example

<include meta='title="tool-error.ts"'>/_examples/shared/reference/core/tool-error.ts</include>

## Options

### `toolError(code, message)`

| Name | Type | Default | Description |
|---|---|---|---|
| `code` | `ToolErrorCode` | required | Why the call failed; one of the codes below. |
| `message` | `string` | required | What happened, and what to do next. A leading `Error:` or `Error [code]:` is stripped, so the code is not repeated. |

### `toolErrorCode(result)`

| Name | Type | Default | Description |
|---|---|---|---|
| `result` | `ModelContextToolResult \| null \| undefined` | required | The result to read the code from. |

### Error codes

`ToolErrorCode` is one of these. Each says what the agent should do next.

| Code | Means | The agent should | `RETRYABLE` |
|---|---|---|---|
| `cancelled` | the person stopped it | stop; retry only if asked | `false` |
| `interrupted` | the page navigated or the tool changed mid-call | check the page, then retry | `true` |
| `timeout` | no answer in time (it may or may not have worked) | check the page, then retry or try another way | `true` |
| `unavailable` | no such tool on this page right now | get to the page that has it | `true` |
| `invalid_input` | the arguments were wrong | fix them and retry | `true` |
| `needs_user` | the person has to choose or confirm | ask them | `false` |
| `failed` | the tool ran and could not do it | read the message | `false` |

`RETRYABLE` is a `Readonly<Record<ToolErrorCode, boolean>>`: whether calling again (after checking the page or fixing the input) can succeed without asking the person.

## Returns

`toolError` returns a failed `ModelContextToolResult`:

```ts
{
  content: [{ type: "text", text: `Error [${code}]: ${message}` }],
  isError: true,
  structuredContent: { error: { code, retryable: RETRYABLE[code] } },
}
```

`toolErrorCode` returns the code from `structuredContent.error.code`, else from an `Error [code]:` prefix on the first text content, and `undefined` when there is no known code.

## Notes

- In a [`WebTool`](./define-web-tool.md) you do not call `toolError` yourself: throw a [`WebToolError`](./web-tool-error.md) to pick the code. Other throws become `failed`, bad input `invalid_input`, and a confirm-gated tool with nothing to confirm on `unavailable`.
- A plain `Error: …` text has no code, so `toolErrorCode` returns `undefined` for it. The chat codes such a text as `failed`.
- A declarative form cannot set `isError`, so it answers with the coded text; `toolErrorCode` reads that too.
- An unknown code in either place is ignored (`undefined`), so a result from another library never throws here.

## See also

- [Errors](../../concepts/errors.mdx), the codes and when each fires
- [`WebToolError`](./web-tool-error.md), the way to pick a code from a tool
- [`errorResult`](./error-result.md), turn any thrown value into a coded result
- [`executeTool`](./execute-tool.md), which returns results like these
