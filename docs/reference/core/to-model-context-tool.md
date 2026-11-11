---
description: "Adapts a WebTool to the ModelContextTool shape that document.modelContext.registerTool takes: it validates input, runs the confirmation gate and turns failures into readable isError results."
---

# `toModelContextTool`

Adapts a [`WebTool`](./define-web-tool.md) to the `ModelContextTool` shape that `document.modelContext.registerTool` takes: it validates input, runs the confirmation gate and turns failures into readable `isError` results. [`registerWebTool`](./register-web-tool.md) uses it; call it directly when you register with WebMCP yourself.

## Import

```ts
import { toModelContextTool } from "@webmcp-agents/core";
import type { ToModelContextToolOptions } from "@webmcp-agents/core";
```

## Example

A confirm-gated tool registered by hand.

<include meta='title="register-by-hand.ts"'>/_examples/shared/reference/core/to-model-context-tool.ts</include>

## Options

`toModelContextTool(tool, options?)`. The first argument is the tool; the second is a `ToModelContextToolOptions`.

| Name | Type | Default | Description |
|---|---|---|---|
| `tool` | `WebTool` | required | The tool to adapt, made with [`defineWebTool`](./define-web-tool.md). |
| `context` | `() => unknown` | not said | Read on every call and passed to `execute` as the earlier form's `ctx.context`. New code closes over its own state instead. |
| `calls` | `CallTracker` | not said | Counts each call (confirmation wait included), so unregistering can wait for it. See [`createCallTracker`](./create-call-tracker.md). |

## Returns

A `ModelContextTool` with `name` (the tool's `id`), `title`, `description`, `inputSchema` (the tool's `jsonSchema`), `annotations` and `execute`. `annotations` are the tool's `annotations` with each flag (`readOnly`, `destructive`, `repeatable`, `external`, `safeResponse`) written over them as its WebMCP hint. It also carries symbol-keyed properties the visual layer reads: a stage that validates a call and finds its control and fields before anything moves, and, for earlier code, the selector forms of the confirmation click and the cursor's target.

Each call through `execute(args, options)`:

1. Parses `args`; a JSON string (Chrome 150) is parsed first. Invalid input answers here, before anything moves.
2. Finds the call's control and the field each parameter is typed into (see [Where the cursor goes](./define-web-tool.md#where-the-cursor-goes)). Whatever the cursor did not type is written now, in one step.
3. Runs the tool's `fill`, if it has one.
4. With `requireConfirmation`, waits for the person's trusted click on the control.
5. Runs `tool.execute` with `{ signal, source: "webmcp", context: context?.() }`.
6. Normalises the return value with [`toToolResult`](./error-result.md).

## Notes

- Errors map to codes: `WebToolInputError` is `invalid_input`, `ConfirmationUnavailableError` is `unavailable`, a [`WebToolError`](./web-tool-error.md) keeps its code, anything else is `failed`. See [`toolError`](./tool-error.md).
- An `AbortError` is rethrown, never turned into a result. If the signal aborted while validating, the work doesn't start.
- With `requireConfirmation`, a control found by name must be unique: with none, or several, the call fails with `ConfirmationUnavailableError`.
- Only a valid call asks the person to confirm: they never approve something that then fails validation.
- Without an `options.signal` from the caller, a signal that never aborts is used.
- The adapter calls `tool.parse` and `tool.execute`, not `tool.run`, so the development-only `outputSchema` check does not run here.

## See also

- [Confirm before it runs](../../build/confirm-before-it-runs.mdx), the gate this adapter runs
- [`defineWebTool`](./define-web-tool.md), the definition it adapts
- [`registerWebTool`](./register-web-tool.md), the adapter plus registration
- [`ConfirmationUnavailableError`](./confirmation-unavailable-error.md), when the gate has no control
- [WebMCP types](./webmcp-types.md), the `ModelContextTool` shape
