---
description: "An error to throw from a tool's execute to pick the code the agent gets."
---

# `WebToolError`

An error to throw from a tool's `execute` to pick the code the agent gets. Without it, a thrown error is coded `failed`; with it the agent can tell bad input from a missing page from a person who must decide.

## Import

```ts
import { WebToolError } from "@webmcp-agents/core";
```

## Example

A lookup that tells the agent its input was wrong, so it can fix the reference and retry.

<include meta='title="tools/get-booking.ts"'>/_examples/shared/reference/core/web-tool-error.ts</include>

The agent gets `Error [invalid_input]: No booking SK-0000. Check the reference.`, with `structuredContent.error` set to `{ code: "invalid_input", retryable: true }`.

## Options

`new WebToolError(code, message)`.

| Name | Type | Default | Description |
|---|---|---|---|
| `code` | `ToolErrorCode` | required | Why the call failed: `cancelled`, `interrupted`, `timeout`, `unavailable`, `invalid_input`, `needs_user` or `failed`. See the table under [`toolError`](./tool-error.md#error-codes). Readable afterwards as `error.code`. |
| `message` | `string` | required | What the agent reads. Say what to do next: "No booking SK-0000. Check the reference." beats "Not found". |

## Returns

An `Error` subclass with `name` `"WebToolError"` and the readonly property `code: ToolErrorCode`.

## Notes

- [`errorResult`](./error-result.md) uses the error's `code` over its own default, so the code survives [`toModelContextTool`](./to-model-context-tool.md) and reaches the agent.
- [`useWebTool`](../react/use-web-tool.md) and [`defineWebTool`](./define-web-tool.md)'s `invoke` reject with a `WebToolError` carrying the agent's code, so your own UI can branch on `error.code`.
- An abort (`AbortError`) is never wrapped: a cancelled call stays a cancellation.

## See also

- [Errors](../../concepts/errors.mdx), the codes and when to use each
- [`toolError`](./tool-error.md), the result it becomes
- [`errorResult`](./error-result.md), how a thrown value is turned into a result
- [`defineWebTool`](./define-web-tool.md), where `execute` lives
