---
description: "Small models pick tools better from a short list with short schemas."
---

# `rankTools`, `compactSchema`, `validateArgs`

Small models pick tools better from a short list with short schemas. These helpers rank the page's tools against the request, compact their schemas, and check a call's arguments before it touches the page. `runLocalAgent` uses all three; reach for them when you write your own loop.

## Import

```ts
import {
  compactSchema,
  rankTools,
  validateArgs,
} from "@webmcp-agents/local-agent";
```

## Example

<include meta='title="rank.ts"'>/_examples/shared/reference/local-agent/tools.ts</include>

## Options

### `rankTools(tools, query, options?)`

| Name | Type | Default | Description |
|---|---|---|---|
| `tools` | `readonly ToolDescriptor[]` | required | The page's tools, as the chat hands them to an adapter (`req.tools`). |
| `query` | `string` | required | The user's request, which the tools are scored against. |
| `max` | `number` | `8` | Most tools returned (an `options` field). |
| `recent` | `readonly string[]` | `[]` | Names of tools used recently, which get a bonus (an `options` field). |

### `compactSchema(schema)`

| Name | Type | Default | Description |
|---|---|---|---|
| `schema` | `JSONSchema` | required | The schema to shorten. |

### `validateArgs(schema, args)`

| Name | Type | Default | Description |
|---|---|---|---|
| `schema` | `JSONSchema` | required | The tool's (compacted) input schema. |
| `args` | `unknown` | required | The arguments the model wrote. |

## Returns

- **`rankTools`** returns at most `max` [`CompactTool`](./provider-types.md#compacttool)s, most relevant first. Scoring is word overlap: +3 per word of the tool's name that is in the query (or shares its first four letters with a query word longer than three), +1 per word of the description in the query, +2 for a recent tool. Ties keep the original order. With `max` or fewer tools, all of them come back in their original order. Descriptions are cut to 400 characters, and schemas go through `compactSchema`.
- **`compactSchema`** keeps only what a small model needs: `type`, `properties`, `required`, `enum`, `minimum`, `maximum`, `items` and `description` (cut to 160 characters), recursively through `properties` and `items`. Everything else is dropped.
- **`validateArgs`** returns the first problem with `args` against `schema`, or `null`. It checks, in order: `args` is an object; every `required` key is present and not `""`; each known property's `type` (including `integer`), `enum`, `minimum` and `maximum`. Unknown arguments are ignored (the page ignores them too). Messages look like `Missing required argument "slug".`, `"qty" must be integer, got "two".`, `"size" must be one of "S", "M", "L".` and `"qty" must be at least 1.`

## Notes

- `validateArgs` covers the same small subset the devtools form uses: enough for a small model's usual mistakes, with no validator dependency. It is not a full JSON Schema validator.
- `rankTools` reads the page's tools fresh each step in `runLocalAgent`, because tools change as the page does.

## See also

- [On-device agent](../../more/on-device-agent.mdx)
- [`runLocalAgent`](./run-local-agent.md)
- [`parseToolCalls`](./tool-call-parser.md)
- [`ToolDescriptor`](../chat/adapter-types.md#tooldescriptor-and-tooloutput)
