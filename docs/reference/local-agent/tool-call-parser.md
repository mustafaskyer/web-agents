---
description: "Reads tool calls out of a small model's free text."
---

# `parseToolCalls`

Reads tool calls out of a small model's free text. Small models drift from the format, so it accepts the common shapes, repairs common mistakes once, and never throws: anything it cannot read stays prose. `createProseFilter` does the streaming half. Reach for them when you write your own provider or UI around a model's raw text; `runLocalAgent` already uses `parseToolCalls`.

## Import

```ts
import {
  createProseFilter,
  parseToolCalls,
} from "@webmcp-agents/local-agent";
import type { ParsedCall, ParseResult } from "@webmcp-agents/local-agent";
```

## Example

<include meta='title="parse.ts"'>/_examples/shared/reference/local-agent/tool-call-parser.ts</include>

## Options

`parseToolCalls(raw, toolNames)` takes two arguments; `createProseFilter()` takes none.

| Name | Type | Default | Description |
|---|---|---|---|
| `raw` | `string` | required | The model's reply. Only the first 32 KB is read. |
| `toolNames` | `ReadonlySet<string>` | required | The tools offered this step. Any other name becomes an error, never a call. |

## Returns

### `parseToolCalls`

A `ParseResult`:

| Name | Type | Description |
|---|---|---|
| `text` | `string` | The prose, with call markup and `<think>…</think>` removed. |
| `calls` | `ParsedCall[]` | The valid calls: `{ name: string; arguments: Record<string, unknown> }`. |
| `errors` | `string[]` | Messages for calls it got wrong, to feed back to the model. |

Shapes it accepts, tried in this order:

| Shape | Example |
|---|---|
| Liquid LFM2, pythonic or JSON | `<\|tool_call_start\|>[add_to_cart(qty=2)]<\|tool_call_end\|>` |
| Qwen / Hermes tags | `<tool_call>{"name": "add_to_cart", "arguments": {"qty": 2}}</tool_call>` |
| A fenced JSON block | ```` ```json {"name": …, "arguments": …} ``` ```` |
| The whole reply as JSON (Prompt API) | `{"type": "tool_call", "name": …, "arguments": …}`, or `{"type": "message", "text": …}` for prose |

Repairs: an unclosed tag runs to the next call or the end; a JSON object cut short is closed; trailing commas and single quotes get one lenient pass; `parameters` is read when `arguments` is missing; string arguments are parsed as JSON.

Errors it reports: `Unknown tool "x". Available now: …`, `Arguments for "x" must be a JSON object.`, and `Couldn't read a tool call: …`.

### `createProseFilter`

An object with two methods:

| Name | Type | Description |
|---|---|---|
| `push(delta)` | `(delta: string) => string` | Returns the prose that is safe to show so far, holding back anything that might start `<tool_call>`, `<\|tool_call_start\|>` or `<think>`, and dropping text inside them. |
| `flush()` | `() => string` | Returns what is left at the end of the reply. |

## Notes

- It does not check arguments against the schema; the loop does that with [`validateArgs`](./tools.md).
- `runLocalAgent` does not stream tokens to the chat; `createProseFilter` is for your own provider or UI.

## See also

- [On-device agent](../../more/on-device-agent.mdx)
- [`runLocalAgent`](./run-local-agent.md)
- [`rankTools`, `compactSchema`, `validateArgs`](./tools.md)
- [`CallFormat`](./provider-types.md#callformat)
