---
description: "Returns the cursor controls of the most recently started createWebAgents (so of WebAgentsProvider), or null."
---

# `currentAgentVisuals`

Returns the cursor controls (`setSpotlight`, `setYieldToUser`) of the most recently started [`createWebAgents`](./create-web-agents.md), so of [`<WebAgentsProvider>`](../react/web-agents-provider.md), that has a cursor, or `null`. For UI that sits beside the provider without a handle on it: the devtools' Settings switches find the cursor this way, which is why `@webmcp-agents/devtools` needs nothing from `@webmcp-agents/react`.

## Import

```ts
import { currentAgentVisuals } from "@webmcp-agents/core";
```

## Example

A spotlight switch of your own, wired to whatever cursor the page has started.

<include meta='title="spotlight-switch.ts"'>/_examples/shared/reference/core/current-agent-visuals.ts</include>

## Options

None: `currentAgentVisuals()` takes no arguments.

## Returns

`Pick<AgentVisuals, "setSpotlight" | "setYieldToUser"> | null`: the same object as that instance's `agents.visuals`. `null` when nothing is started, or every started instance has `visuals: false`.

## Notes

- Read it when you need it, not at import time: an instance counts from `start()` to `destroy()`. A React component reads it in an effect: the provider's layout effect has started it by then.
- With several started instances, the latest started wins; one with `visuals: false` is skipped.
- A change made while the cursor is not installed yet (the polyfill still loading) becomes the cursor's starting option.
- On the server it returns `null`: nothing starts there.

## See also

- [`createWebAgents`](./create-web-agents.md), whose `visuals` this returns
- [`installWebAgentsDevtools`](../devtools/install-web-agents-devtools.md), whose `visuals` defaults to it
- [`installAgentVisuals`](./install-agent-visuals.md), the cursor and its options
