---
description: "Says that a tool is waiting for the person (a choice, a confirmation) and what they should do."
---

# `waitingForUser`

Says that a tool is waiting for the person (a choice, a confirmation) and what they should do. Reach for it inside a tool's `execute` when the call cannot finish without them: the chat shows the prompt on the call, and agents do not time the call out while the person is being asked.

## Import

```ts
import { waitingForUser } from "@webmcp-agents/core";
```

## Example

A tool that needs a size the agent did not give. It asks, waits, and answers with a coded error if the person does not choose.

<include meta='title="tools/add-to-cart.ts"'>/_examples/shared/reference/core/waiting-for-user.ts</include>

## Options

`waitingForUser(tool, prompt)`.

| Name | Type | Default | Description |
|---|---|---|---|
| `tool` | `string` | required | The id of the tool that is waiting: the events and the chat attach the prompt to that tool's call. |
| `prompt` | `string` | required | What the person should do, in a few words, e.g. `"Choose a size"`. Shown to them. |

## Returns

Nothing (`void`). It emits `{ type: "park", tool, prompt }` to every [`onAgentEvent`](./on-agent-event.md) listener.

## Notes

- Use it for waits beyond a confirm the browser already pauses on: a tool with `requireConfirmation` and a declarative form without `toolautosubmit` already emit `park`. `get_location` from `@webmcp-agents/tools` uses it while the browser asks for permission.
- It only says the tool waits; the waiting itself is your code (an await on the person's choice).
- If the person does not answer, finish with a [`WebToolError`](./web-tool-error.md) of code `needs_user` so the agent knows to ask them.

## See also

- [Confirm before it runs](../../build/confirm-before-it-runs.mdx), the built-in wait
- [`onAgentEvent`](./on-agent-event.md), where the `park` event arrives
- [`toolError`](./tool-error.md), the `needs_user` code
- [Errors](../../concepts/errors.mdx), time limits and waiting for the person
