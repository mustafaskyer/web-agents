# `toModelContextTool`

Adapts a [`WebTool`](./define-web-tool.md) to the `ModelContextTool` shape that `document.modelContext.registerTool` takes. It validates input, runs the confirmation gate, and turns failures into readable `isError` results. [`registerWebTool`](./register-web-tool.md) uses it; call it directly when you register with WebMCP yourself.

```ts
import { toModelContextTool } from "@webmcp-agents/core";
```

## Signature

```ts
function toModelContextTool(tool: WebTool, options?: ToModelContextToolOptions): ModelContextTool;

interface ToModelContextToolOptions {
  context?: () => unknown;
  calls?: CallTracker;
}
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `tool` | `WebTool` | — | The tool to adapt. |
| `context` | `() => unknown` | — | Read on every call and passed to `execute` as `ctx.context`. |
| `calls` | `CallTracker` | — | Counts each call (confirmation wait included), so unregistering can wait for it. |

## Returns

A `ModelContextTool` with `name` (the tool's `id`), `title`, `description`, `inputSchema` (the tool's `jsonSchema`), `annotations` and `execute`. It also carries two symbol-keyed properties the visual layer reads: where a confirmation click must land, and where the cursor goes.

Each call through `execute(args, options)`:

1. Parses `args`; a JSON string (Chrome 150) is parsed first.
2. With `requireConfirmation`, waits for the person's trusted click on the target.
3. Runs `tool.execute` with `{ signal, source: "webmcp", context: context?.() }`.
4. Normalises the return value with [`toToolResult`](./error-result.md).

## Example

```ts
import { defineWebTool, toModelContextTool } from "@webmcp-agents/core";

const tool = defineWebTool({
  id: "clear_cart",
  description: "Remove every item from the cart. The user confirms on the page.",
  annotations: { destructiveHint: true },
  requireConfirmation: true,
  execute: () => cart.clear(),
});

document.modelContext?.registerTool(toModelContextTool(tool));
```

## Notes

- Errors map to codes: `WebToolInputError` is `invalid_input`, `ConfirmationUnavailableError` is `unavailable`, a [`WebToolError`](./web-tool-error.md) keeps its code, anything else is `failed`. See [`toolError`](./tool-error.md).
- An `AbortError` is rethrown, never turned into a result. If the signal aborted while validating, the work doesn't start.
- Only a valid call asks the user to confirm: the person never approves something that then fails validation.
- Without `options.signal` from the caller, a signal that never aborts is used.
- The adapter calls `tool.parse` and `tool.execute`, not `tool.run`, so the dev-only `outputSchema` check does not run here.

## See also

- [`defineWebTool`](./define-web-tool.md)
- [`registerWebTool`](./register-web-tool.md)
- [`ConfirmationUnavailableError`](./confirmation-unavailable-error.md)
- [`createCallTracker`](./create-call-tracker.md)
- [WebMCP types](./webmcp-types.md)
