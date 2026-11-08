# `rankTools`, `compactSchema`, `validateArgs`

Small models pick tools better from a short list with short schemas. These helpers rank the page's tools against the
request, compact their schemas, and check a call's arguments before it touches the page. `runLocalAgent` uses all
three.

```ts
import { compactSchema, rankTools, validateArgs } from "@web-agents/local-agent";
```

## Signature

```ts
function rankTools(
  tools: readonly ToolDescriptor[],
  query: string,
  options?: { max?: number; recent?: readonly string[] },
): CompactTool[];

function compactSchema(schema: JSONSchema): JSONSchema;

function validateArgs(schema: JSONSchema, args: unknown): string | null;
```

## `rankTools`

| Name | Type | Default | Description |
|---|---|---|---|
| `tools` | `readonly ToolDescriptor[]` | — | The page's tools. |
| `query` | `string` | — | The user's request. |
| `options.max` | `number` | `8` | Most tools returned. |
| `options.recent` | `readonly string[]` | `[]` | Names of tools used recently. |

Returns at most `max` [`CompactTool`](./provider-types.md#compacttool)s, most relevant first. Scoring is word overlap:
+3 per word of the tool's name that is in the query (or shares its first four letters with a query word longer than
three), +1 per word of the description in the query, +2 for a recent tool. Ties keep the original order. With `max` or
fewer tools, all of them come back in their original order. Descriptions are cut to 400 characters, and schemas go
through `compactSchema`.

## `compactSchema`

Keeps only what a small model needs: `type`, `properties`, `required`, `enum`, `minimum`, `maximum`, `items` and
`description` (cut to 160 characters), recursively through `properties` and `items`. Everything else is dropped.

## `validateArgs`

Returns the first problem with `args` against `schema`, or `null`. It checks, in order: `args` is an object; every
`required` key is present and not `""`; each known property's `type` (including `integer`), `enum`, `minimum` and
`maximum`. Unknown arguments are ignored (the page ignores them too).

Messages look like `Missing required argument "slug".`, `"qty" must be integer, got "two".`,
`"size" must be one of "S", "M", "L".`, `"qty" must be at least 1.`

## Example

```ts
const tools = rankTools(req.tools, "add two mugs to the cart", { max: 4, recent: ["search_products"] });

const problem = validateArgs(tools[0]!.parameters, { qty: 0 });
if (problem) console.log(problem); // e.g. "qty" must be at least 1.
```

## Notes

- `validateArgs` covers the same small subset the devtools form uses: enough for a small model's usual mistakes,
  with no validator dependency. It is not a full JSON Schema validator.

## See also

- [`runLocalAgent`](./run-local-agent.md)
- [`parseToolCalls`](./tool-call-parser.md)
- [`ToolDescriptor`](../chat/adapter-types.md#tooldescriptor-and-tooloutput)
