# `UI_HOST_ATTR`

The attribute name that marks the host element of a library UI, such as the devtools panel or the chat widget. Input inside such an element never makes the agent cursor yield, because the user is driving the agent from there.

```ts
import { UI_HOST_ATTR } from "@web-agents/core";
```

## Signature

```ts
const UI_HOST_ATTR: "data-web-agents-ui";
```

## Value

`"data-web-agents-ui"`. Any value on the attribute works; the devtools set `"devtools"` and the chat sets `"chat"`.

## Example

```ts
import { UI_HOST_ATTR } from "@web-agents/core";

const host = document.createElement("div");
host.setAttribute(UI_HOST_ATTR, "chat");
document.body.append(host);
```

## Notes

- The default `yieldToUser.ignore` selector of [`installAgentVisuals`](./install-agent-visuals.md) is `[data-web-agents-ui]`. Passing your own `ignore` replaces it.
- The match uses the event's `composedPath()`, so a host whose UI lives in a shadow root still counts.
- The spotlight cuts in-place library UI (a `data-web-agents-ui` host with a size) out of the blur.

## See also

- [`installAgentVisuals`](./install-agent-visuals.md)
