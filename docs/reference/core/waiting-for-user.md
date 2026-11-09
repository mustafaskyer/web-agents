# `waitingForUser`

Says that a tool is waiting for the person (a choice, a confirmation) and what they should do. The chat shows the prompt on the call, and agents don't time the call out while the person is being asked.

```ts
import { waitingForUser } from "@webmcp-agents/core";
```

## Signature

```ts
function waitingForUser(tool: string, prompt: string): void;
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `tool` | `string` | — | The tool name that is waiting. |
| `prompt` | `string` | — | What the person should do, e.g. `"Choose a size"`. |

## Returns

Nothing. It emits `{ type: "park", tool, prompt }` to every [`onAgentEvent`](./on-agent-event.md) listener.

## Example

From the ecommerce app's add-to-cart form, when a product needs a size the agent didn't give:

```ts
import { waitingForUser } from "@webmcp-agents/core";

setAsking({ qty: qtyToAdd, settle });
waitingForUser("add_to_cart", `Choose a ${axis.name.toLowerCase()} to add ${product.name}`);
```

If the person doesn't choose, the form answers the agent with a coded text, `Error [needs_user]: …` (see [`toolError`](./tool-error.md)).

## Notes

- Use it for waits beyond a confirm the browser already pauses on. A declarative form without `toolautosubmit`, and a `WebTool` with `requireConfirmation`, already emit `park`.

## See also

- [`onAgentEvent`](./on-agent-event.md)
- [`toolError`](./tool-error.md)
