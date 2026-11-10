---
description: "Builds the system prompt the chat handler sends the model."
---

# `buildSystemPrompt`

Builds the system prompt the chat handler sends the model. `DEFAULT_SYSTEM_PROMPT` says how to act on a live page, and `buildSystemPrompt` adds the page's path, the agent's instructions (from the server's registry) and, when the agent has sub-agents, the delegation note. Use it to build the same prompt elsewhere, or to start a custom prompt from the default. Page-supplied text (titles, tool descriptions) never goes in here.

## Import

```ts
import {
  buildSystemPrompt,
  DEFAULT_SYSTEM_PROMPT,
} from "@webmcp-agents/chat/server";
```

## Example

Extend the default prompt with a fact about the whole site, hand it to the handler, and build the prompt a request would get.

<include meta='title="system-prompt.ts"'>/_examples/shared/reference/chat/system-prompt.ts</include>

## Options

`buildSystemPrompt(base, path?, instructions?, delegation?)`:

| Name | Type | Default | Description |
|---|---|---|---|
| `base` | `string` | required | The prompt to start from: `DEFAULT_SYSTEM_PROMPT`, or your own. |
| `path` | `string` | not set | The page's path. When given, a line is added: `The user is on the page "<path>" of this site.` (the path JSON-quoted). |
| `instructions` | `readonly string[]` | not set | The agent's lines (`WebAgent.instructions`), added under `About this site:`. |
| `delegation` | `boolean` | `false` | Add the delegation note: what the `delegate_to_<agent>` tools are for. |

## Returns

A string: `base`, then, each after a blank line and only when given, the path line, `About this site:` followed by the instruction lines, and the delegation note.

### What `DEFAULT_SYSTEM_PROMPT` says

- It is an assistant embedded in the page the user is looking at, acting on the live page through tools while the user watches.
- Tools change as the page changes: call only tools listed in this request, never invent names or arguments, ask for missing values.
- Some tools pause for the user to confirm on the page (orders, payments, bookings, deletions). When a result says it was cancelled or is still waiting, tell the user what to click; never claim it succeeded.
- A failed result starts with `Error [code]:`, and each code says what to do next (`cancelled`, `interrupted` or `timeout`, `unavailable`, `invalid_input`, `needs_user`, `failed`).
- Ask before a consequential action the user did not explicitly request.
- Keep replies short and plain; no markdown tables or headings.

## Notes

- The handler calls it through [`toToolLoopAgentSettings`](./to-tool-loop-agent.md). The path is only set for a same-origin browser request, and the instructions come from the registered agent, never the request.
- If you replace the prompt, keep the per-code guidance: tool failures arrive as `Error [code]: …`.
- Do not put page text in a custom system prompt: the page and its users control it.

## See also

- [Define an agent](../../build/define-an-agent.mdx), where `instructions` are written
- [`createChatHandler`](./create-chat-handler.md), its `system` option
- [`toToolLoopAgent`](./to-tool-loop-agent.md)
- [Tool error codes](../core/tool-error.md)
