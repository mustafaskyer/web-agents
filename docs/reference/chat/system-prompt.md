# `buildSystemPrompt`

The system prompt the chat handler sends Claude: `DEFAULT_SYSTEM_PROMPT` says how to act on a live page, and
`buildSystemPrompt` adds the page's path when it is known. Page-supplied text (titles, tool descriptions) never goes in
here.

```ts
import { buildSystemPrompt, DEFAULT_SYSTEM_PROMPT } from "@webmcp-agents/chat/server";
```

## Signature

```ts
const DEFAULT_SYSTEM_PROMPT: string;
function buildSystemPrompt(base: string, path?: string): string;
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `base` | `string` | — | The prompt to start from: `DEFAULT_SYSTEM_PROMPT`, or your own. |
| `path` | `string` | — | The page's path. When given, a line is added. |

## Returns

`base` unchanged without `path`. With it, `base` plus a blank line and
`The user is on the page "<path>" of this site.` (the path JSON-quoted).

## What `DEFAULT_SYSTEM_PROMPT` says

- It is an assistant embedded in the page the user is looking at, acting on the live page through tools while the
  user watches.
- Tools change as the page changes: call only tools listed in this request, never invent names or arguments, ask for
  missing values.
- Some tools pause for the user to confirm on the page (orders, payments, bookings, deletions). When a result says it
  was cancelled or is still waiting, tell the user what to click; never claim it succeeded.
- A failed result starts with `Error [code]:`, and each code says what to do next (`cancelled`, `interrupted` or
  `timeout`, `unavailable`, `invalid_input`, `needs_user`, `failed`).
- Ask before a consequential action the user did not explicitly request.
- Keep replies short and plain; no markdown tables or headings.

## Example

```ts
import { createChatHandler, DEFAULT_SYSTEM_PROMPT } from "@webmcp-agents/chat/server";

const handler = createChatHandler({
  system: `${DEFAULT_SYSTEM_PROMPT}\n\n- This is Field Store. Prices are in USD.`,
});
```

## Notes

- The handler calls `buildSystemPrompt(opts.system ?? DEFAULT_SYSTEM_PROMPT, path)` itself; the path is only set for
  a same-origin browser request (see [`createChatHandler`](./create-chat-handler.md)). You need this function only to
  build the same prompt elsewhere.
- If you replace the prompt, keep the per-code guidance: tool failures arrive as `Error [code]: …`.
- Don't put page text in a custom system prompt: it is controlled by the page and its users.

## See also

- [`createChatHandler`](./create-chat-handler.md)
- [Tool error codes](../core/tool-error.md)
