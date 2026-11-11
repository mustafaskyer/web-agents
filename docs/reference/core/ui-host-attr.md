---
description: "The attribute name that marks the host element of a library UI, such as the devtools panel or the chat."
---

# `UI_HOST_ATTR`

The attribute name that marks the host element of a library UI, such as the devtools panel or the chat. Put it on a panel of your own that drives the agent: input inside it never makes the agent cursor yield, and the cursor never aims at its controls.

## Import

```ts
import { UI_HOST_ATTR } from "@webmcp-agents/core";
```

## Example

<include meta='title="my-panel.ts"'>/_examples/shared/reference/core/ui-host-attr.ts</include>

## Options

A constant, not a function: `UI_HOST_ATTR` is the string `"data-web-agents-ui"`.

| Name | Type | Default | Description |
|---|---|---|---|
| attribute value | `string` | any | The attribute's value is not read, so any value works. The devtools set `"devtools"` and the chat sets `"chat"`; a distinct value helps when you inspect the DOM. |

## Returns

The attribute name, typed as the literal `"data-web-agents-ui"`.

## Notes

- The default `yieldToUser.ignore` selector of [`installAgentVisuals`](./install-agent-visuals.md) is `[data-web-agents-ui]`. Passing your own `ignore` replaces it.
- The match uses the event's `composedPath()`, so a host whose UI lives in a shadow root still counts.
- The spotlight cuts an in-place library UI (a host with a size) out of its blur, so it stays sharp.
- [`locate`](./locate.md) never picks a control inside a host: the cursor does not click the chat's own buttons.
- It marks a host element, not a single control: put it on the container of the whole panel.

## See also

- [The agent cursor](../../concepts/agent-cursor.mdx), what yielding means
- [`installAgentVisuals`](./install-agent-visuals.md), its `yieldToUser` option
- [`locate`](./locate.md), the finder that skips library UI
