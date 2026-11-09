# `defineWebTool`

Defines a tool once for every place a tool runs: the browser (`document.modelContext`), devtools, and a server agent. The config is a structural superset of Mastra's `createTool` config and the AI SDK's `tool()` input.

```ts
import { defineWebTool } from "@webmcp-agents/core";
```

## Signature

```ts
function defineWebTool<I, O>(
  config: WebToolConfig<I, O> & { inputSchema: StandardSchemaV1<unknown, I> },
): WebTool<I, O> & { readonly inputSchema: StandardSchemaV1<unknown, I> };
function defineWebTool<I = unknown, O = unknown>(config: WebToolConfig<I, O>): WebTool<I, O>;

interface WebToolConfig<I = unknown, O = unknown> {
  id: string;
  title?: string;
  description: string;
  inputSchema?: StandardSchemaV1<unknown, I> | JSONSchema;
  outputSchema?: StandardSchemaV1<unknown, O>;
  annotations?: WebToolAnnotations;
  requireConfirmation?: boolean;
  target?: string | TargetFn<I>;
  execute(input: I, ctx: WebToolContext): O | Promise<O>;
}

interface WebTool<I = unknown, O = unknown> extends Readonly<Omit<WebToolConfig<I, O>, "execute">> {
  readonly kind: "web-tool";
  readonly jsonSchema: JSONSchema;
  execute(input: I, ctx: WebToolContext): Promise<O>;
  parse(input: unknown): Promise<I>;
  run(input: unknown, ctx: WebToolContext): Promise<O>;
}

interface WebToolContext {
  signal: AbortSignal;
  source: "webmcp" | "chat" | "devtools" | "test";
  toolCallId?: string;
  context?: RegisteredContext;
}

type TargetFn<I> = { pick(input: I): string | undefined }["pick"];

interface Register {}
type RegisteredContext = Register extends { context: infer C } ? C : unknown;

class WebToolInputError extends Error {
  readonly toolId: string;
  readonly issues: ReadonlyArray<StandardSchemaV1.Issue>;
}
```

## Options

`WebToolConfig`:

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | — | The WebMCP tool name: 1–128 of `a-z A-Z 0-9 _ . -`. Snake case reads best to agents (`clear_cart`). |
| `title` | `string` | — | Human-readable name, for UIs that list tools. |
| `description` | `string` | — | What the tool does and when to use it. The agent reads this to decide. |
| `inputSchema` | `StandardSchemaV1 \| JSONSchema` | no input | Standard Schema (zod 4, valibot, arktype) or a JSON Schema object. Must describe an object. |
| `outputSchema` | `StandardSchemaV1` | — | Checked in development only by `run`: a mismatch warns, never throws. |
| `annotations` | `WebToolAnnotations` | — | MCP hints for the agent, never enforced. |
| `requireConfirmation` | `boolean` | `false` | Wait for the person to click the tool's element (`target`) before running. With the visuals installed, the cursor parks on the element instead of clicking it. |
| `target` | `string \| TargetFn<I>` | `` [toolname="<id>"] `` | CSS selector of the element the tool acts on: where the cursor goes. A function gets the call's input and picks the element per call; returning `undefined` falls back to the default. |
| `execute` | `(input: I, ctx: WebToolContext) => O \| Promise<O>` | — | Do the work. Throw for bad input or failures: the agent gets the message as an error result. |

`WebToolAnnotations` (all optional `boolean`, plus any other `[hint: string]: unknown`):

| Name | Description |
|---|---|
| `readOnlyHint` | The tool only reads. |
| `destructiveHint` | The tool may destroy or overwrite data. |
| `idempotentHint` | Calling again with the same input has no further effect. |
| `openWorldHint` | The tool reaches beyond the page (network, other systems). |
| `untrustedContentHint` | The result may contain content the agent should not trust as instructions. |

`WebToolContext`, what `execute` gets besides its input:

| Name | Type | Description |
|---|---|---|
| `signal` | `AbortSignal` | Aborts when the call is cancelled (the agent gave up, the user cancelled). |
| `source` | `"webmcp" \| "chat" \| "devtools" \| "test"` | Who called. |
| `toolCallId` | `string` | Optional call id. |
| `context` | `RegisteredContext` | App state from the provider's `context` prop or the registry's `context` option. Typed via `Register`. |

## Returns

A frozen `WebTool`: the config fields plus

- `kind`: always `"web-tool"`.
- `jsonSchema`: the input schema as JSON Schema draft-07, without `$schema`. Computed on first read. No `inputSchema` gives `{ type: "object", properties: {} }`.
- `execute(input, ctx)`: the config's `execute`, always async.
- `parse(input)`: validate with the Standard Schema's `~standard.validate`. A JSON Schema input passes through. `undefined` / `null` input becomes `{}`. Throws `WebToolInputError`.
- `run(input, ctx)`: `parse`, then `execute`, then the dev-only `outputSchema` check.

`WebToolInputError` is thrown by `parse`. Its message is `Invalid input for <id>: <path>: <message>; …`, naming each bad field for the agent to fix its call.

## Example

From the ecommerce app (`apps/ecommerce/src/tools/cartLines.ts`, simplified):

```ts
import { defineWebTool } from "@webmcp-agents/core";
import { z } from "zod";

declare module "@webmcp-agents/core" {
  interface Register {
    context: StoreContext; // { cart, ui, navigate }
  }
}

export const removeFromCart = defineWebTool({
  id: "remove_from_cart",
  title: "Remove a cart line",
  description: "Remove one line from the cart. Needs: the cart open (open_cart).",
  inputSchema: z.object({ slug: z.string(), variant: z.string().optional() }),
  annotations: { destructiveHint: true },
  target: ({ slug }) => `[data-line^="${slug}:"] button[aria-label^="Remove"]`,
  execute: ({ slug, variant }, ctx) => ctx.context!.cart.remove(slug, variant),
});
```

## Notes

- The `id` is checked at definition time; an invalid one throws a `TypeError`.
- `jsonSchema` throws a `TypeError` if the Standard Schema library doesn't implement Standard JSON Schema (pass a JSON Schema object instead, e.g. `z.toJSONSchema(schema, { target: "draft-07", io: "input" })`), or if the schema's `type` is not `"object"`. A missing `type` is set to `"object"`.
- A function `target` gets the arguments as sent, before validation, so read them defensively. A throw, or an invalid selector, falls back to the default. `TargetFn` is declared as a method so a `WebTool<Input>` still fits where a `WebTool<unknown>` is expected.
- `outputSchema` is checked only when `NODE_ENV` is not `"production"`, and only by `run`.
- With `requireConfirmation`, input is validated before asking, and with nothing clickable to confirm on the call fails with [`ConfirmationUnavailableError`](./confirmation-unavailable-error.md).
- Throw a [`WebToolError`](./web-tool-error.md) to choose the error code the agent gets. Other throws are `failed`, bad input is `invalid_input`.

## See also

- [`registerWebTool`](./register-web-tool.md)
- [`toModelContextTool`](./to-model-context-tool.md)
- [`createToolRegistry`](./create-tool-registry.md)
- [`WebToolError`](./web-tool-error.md)
- [`webToolSignature`](./web-tool-signature.md)
