# `parseToolCalls`

Reads tool calls out of a small model's free text. Small models drift from the format, so it accepts the common
shapes, repairs common mistakes once, and never throws: anything it can't read stays prose. `createProseFilter` does
the streaming half: it passes prose through and holds back tool-call and thinking markup.

```ts
import { createProseFilter, parseToolCalls } from "@web-agents/local-agent";
import type { ParsedCall, ParseResult } from "@web-agents/local-agent";
```

## Signature

```ts
function parseToolCalls(raw: string, toolNames: ReadonlySet<string>): ParseResult;
function createProseFilter(): { push(delta: string): string; flush(): string };

interface ParsedCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface ParseResult {
  text: string;
  calls: ParsedCall[];
  errors: string[];
}
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `raw` | `string` | — | The model's reply. Only the first 32 KB is read. |
| `toolNames` | `ReadonlySet<string>` | — | The tools offered this step. Any other name becomes an error, never a call. |

## Returns

`ParseResult`: `text` is the prose with call markup and `<think>…</think>` removed; `calls` are the valid calls;
`errors` are messages for calls it got wrong (fed back to the model).

Shapes it accepts, tried in this order:

| Shape | Example |
|---|---|
| Liquid LFM2, pythonic or JSON | `<\|tool_call_start\|>[add_to_cart(qty=2)]<\|tool_call_end\|>` |
| Qwen / Hermes tags | `<tool_call>{"name": "add_to_cart", "arguments": {"qty": 2}}</tool_call>` |
| A fenced JSON block | ```` ```json {"name": …, "arguments": …} ``` ```` |
| The whole reply as JSON (Prompt API) | `{"type": "tool_call", "name": …, "arguments": …}`, or `{"type": "message", "text": …}` for prose |

Repairs: an unclosed tag runs to the next call or the end; a JSON object cut short is closed; trailing commas and
single quotes get one lenient pass; `parameters` is read when `arguments` is missing; string arguments are parsed as
JSON.

Errors it reports: `Unknown tool "x". Available now: …`, `Arguments for "x" must be a JSON object.`, and
`Couldn't read a tool call: …`.

## `createProseFilter`

`push(delta)` returns the prose that is safe to show so far, holding back anything that might start `<tool_call>`,
`<|tool_call_start|>` or `<think>`, and dropping text inside them. `flush()` returns what is left at the end.

## Example

```ts
const result = parseToolCalls(
  'Opening it.<tool_call>{"name": "open_product", "arguments": {"slug": "trail-cap"}',
  new Set(["open_product", "search_products"]),
);
// { text: "Opening it.", calls: [{ name: "open_product", arguments: { slug: "trail-cap" } }], errors: [] }
```

```ts
const filter = createProseFilter();
filter.push("Sure <tool_"); // "Sure "
filter.push('call>{"name":"open_cart"}</tool_call> done'); // " done"
filter.flush(); // ""
```

## Notes

- It does not check arguments against the schema; the loop does that with [`validateArgs`](./tools.md#validateargs).
- `runLocalAgent` doesn't stream tokens to the chat; `createProseFilter` is for your own provider or UI.

## See also

- [`runLocalAgent`](./run-local-agent.md)
- [`rankTools`, `compactSchema`, `validateArgs`](./tools.md)
- [`CallFormat`](./provider-types.md#callformat)
