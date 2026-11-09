# `WebToolError`

An error to throw from a tool's `execute` to pick the code the agent gets. Without it, a thrown error is coded `failed`.

```ts
import { WebToolError } from "@webmcp-agents/core";
```

## Signature

```ts
class WebToolError extends Error {
  name: "WebToolError";
  readonly code: ToolErrorCode;
  constructor(code: ToolErrorCode, message: string);
}
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `code` | `ToolErrorCode` | — | One of the codes listed in [`toolError`](./tool-error.md). |
| `message` | `string` | — | What the agent reads. Say what to do next. |

## Returns

An `Error` instance with `code`.

## Example

From the flights app (`apps/flights/src/tools/getBooking.ts`):

```ts
import { defineWebTool, WebToolError } from "@webmcp-agents/core";
import { z } from "zod";

export const getBooking = defineWebTool({
  id: "get_booking",
  title: "Look up a booking",
  description: "Look up a confirmed booking's itinerary by its reference (SK-…), from any page.",
  inputSchema: z.object({ reference: z.string().regex(/^SK-[A-Z0-9]{6}$/i) }),
  annotations: { readOnlyHint: true },
  execute: ({ reference }, ctx) => {
    const booking = app(ctx).booking.getBooking(reference);
    if (!booking) throw new WebToolError("invalid_input", `No booking ${reference.toUpperCase()}.`);
    return itineraryText(booking);
  },
});
```

The agent gets `Error [invalid_input]: No booking SK-7F3K2Q.` with `structuredContent.error` set to `{ code: "invalid_input", retryable: true }`.

## Notes

- [`errorResult`](./error-result.md) uses the error's `code` over its own default, so the code survives [`toModelContextTool`](./to-model-context-tool.md).

## See also

- [`toolError`](./tool-error.md)
- [`errorResult`](./error-result.md)
- [`defineWebTool`](./define-web-tool.md)
