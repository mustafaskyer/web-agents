# `toolError`

Builds a failed tool result that says why with one code, twice: in the text every model reads (`Error [invalid_input]: …`) and in `structuredContent.error` (`{ code, retryable }`) for browsers, devtools and code that branches on it. `toolErrorCode` reads the code back from either place.

```ts
import { RETRYABLE, toolError, toolErrorCode, type ToolErrorCode } from "@webmcp-agents/core";
```

## Signature

```ts
type ToolErrorCode = "cancelled" | "interrupted" | "timeout" | "unavailable" | "invalid_input" | "needs_user" | "failed";

const RETRYABLE: Readonly<Record<ToolErrorCode, boolean>>;

function toolError(code: ToolErrorCode, message: string): ModelContextToolResult;

function toolErrorCode(result: ModelContextToolResult | null | undefined): ToolErrorCode | undefined;
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `code` | `ToolErrorCode` | — | Why the call failed. |
| `message` | `string` | — | What happened. A leading `Error:` or `Error [code]:` is stripped, so the code isn't repeated. |
| `result` | `ModelContextToolResult \| null \| undefined` | — | For `toolErrorCode`: the result to read. |

## Error codes

| Code | Means | The agent should | `RETRYABLE` |
|---|---|---|---|
| `cancelled` | the user stopped it | stop; retry only if asked | `false` |
| `interrupted` | the page navigated or the tool changed mid-call | check the page, then retry | `true` |
| `timeout` | no answer in time (it may or may not have worked) | check the page, then retry or try another way | `true` |
| `unavailable` | no such tool on this page right now | get to the page that has it | `true` |
| `invalid_input` | the arguments were wrong | fix them and retry | `true` |
| `needs_user` | the user has to choose or confirm | ask them | `false` |
| `failed` | the tool couldn't do it | read the message | `false` |

`RETRYABLE` says whether calling again (after checking the page or fixing the input) can succeed without asking the user.

## Returns

`toolError` returns:

```ts
{
  content: [{ type: "text", text: `Error [${code}]: ${message}` }],
  isError: true,
  structuredContent: { error: { code, retryable: RETRYABLE[code] } },
}
```

`toolErrorCode` returns the code from `structuredContent.error.code`, else from an `Error [code]:` prefix on the first text content. It returns `undefined` when there is no known code.

## Example

```ts
import { toolError, toolErrorCode } from "@webmcp-agents/core";

const result = toolError("unavailable", 'No tool "place_order" on this page. Go to /checkout first.');
toolErrorCode(result); // "unavailable"

// a declarative form can't set isError, so it answers with coded text
toolErrorCode({ content: [{ type: "text", text: "Error [needs_user]: Ask them which size." }] }); // "needs_user"
```

## Notes

- In a [`WebTool`](./define-web-tool.md), you don't call `toolError` yourself: throw a [`WebToolError`](./web-tool-error.md) to pick the code. Other throws become `failed`, bad input `invalid_input`, and nothing on the page to confirm on `unavailable`.
- A plain `"Error: …"` text has no code; `toolErrorCode` returns `undefined` for it. The chat codes such a text as `failed`.

## See also

- [`WebToolError`](./web-tool-error.md)
- [`errorResult`](./error-result.md)
- [`executeTool`](./execute-tool.md)
