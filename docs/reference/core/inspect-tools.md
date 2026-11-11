---
description: "Lists every WebTool on the page with the control each would act on and the field each parameter would be typed into, found the way the cursor finds them."
---

# `inspectTools`

Lists every WebTool on the page with the control each would act on and the field each parameter would be typed into, found the way the cursor finds them. It is what the devtools' Tools tab reads; use it for your own checks ("does my tool find its button?").

## Import

```ts
import { inspectTools } from "@webmcp-agents/core";
import type { ToolControls, ToolInspection } from "@webmcp-agents/core";
```

## Example

Warn about tools that would run unseen or unconfirmably. Run it once the page has rendered, not during server rendering.

<include meta='title="check-tools.ts"'>/_examples/shared/reference/core/inspect-tools.ts</include>

## Options

None: `inspectTools()` takes no arguments.

## Returns

A `ToolInspection[]`: one entry for each WebTool that is registered, plus the catalog tools of every started [`createWebAgents`](./create-web-agents.md) (on or off here). Empty on the server. Each entry has the fields of `ToolControls` and two more.

| Name | Type | Description |
|---|---|---|
| `tool` | `WebTool` | The definition: `match`, the flags, `requireConfirmation`, `title`. For a registered tool, the latest definition. |
| `fits` | `boolean` | Its `match` fits the current path (always `true` without one). |
| `by` | `"target" \| "marker" \| "name" \| "call"` | How the control is found: its `target`, a `toolname` marker element, its name (`title`, or the id as words), or `call`: a function `target`, which depends on each call's input, so nothing is resolved here. |
| `controls` | `Element[]` | The controls found that way, in document order. One is what a confirm-gated tool needs; none, and the tool runs unseen. |
| `fields` | `{ name: string; field: Element \| null }[]` | Each parameter of the input schema and the field its value would be typed into (`null`: nothing is typed, `execute` still gets the value). |

Whether a tool is registered right now is what `document.modelContext.getTools()` lists, not part of the result.

## Notes

- Elements are live: read the result when you show it, do not keep it.
- A tool whose `target` is a function is reported as `by: "call"` with no controls, rather than guessed with made-up input; with no control to search from, only parameters named in `fields` get a field.
- The cursor's own resolver does the work, so what you see here is what the cursor and the confirmation gate will use.
- A tool registered and also in a catalog appears once; the registered definition wins, because it is what an agent calls.

## See also

- [Devtools](../../build/devtools.mdx), where the same data is shown
- [`locate`](./locate.md)
- [`defineWebTool`](./define-web-tool.md)
- [`createWebAgents`](./create-web-agents.md)
