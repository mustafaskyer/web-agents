---
description: "Decides which catalog tools are registered with WebMCP right now."
---

# `createToolRegistry`

Decides which catalog tools are registered with WebMCP right now. Every part of the app that wants a tool on (a route, a mounted component, the app shell) enables it and gets a disposer; a tool stays registered while anyone holds it. [`createWebAgents`](./create-web-agents.md) (and so `<WebAgentsProvider>`) builds on it and exposes it as `registry`: most apps never create one, they give tools a `match` instead.

## Import

```ts
import { createToolRegistry } from "@webmcp-agents/core";
import type { ToolRegistry, ToolRegistryOptions } from "@webmcp-agents/core";
```

## Example

A registry over two tools: one held by the app shell, one by a checkout screen that releases it when it leaves. The cursor is installed in `beforeRegister`, so every tool is animated.

<include meta='title="tool-registry.ts"'>/_examples/shared/reference/core/create-tool-registry.ts</include>

## Options

`createToolRegistry(catalog, options?)`. The first argument is every tool the app may register; the second is a `ToolRegistryOptions`.

| Name | Type | Default | Description |
|---|---|---|---|
| `catalog` | `readonly WebTool[]` | required | Every tool the app may register, made with [`defineWebTool`](./define-web-tool.md). Ids must be unique: a duplicate throws. Nothing is registered until something calls `enable`. |
| `beforeRegister` | `() => void` | not said | Called before each WebMCP registration. Install the cursor here ([`installAgentVisuals`](./install-agent-visuals.md)), so it can hold and animate a tool from its first call. |
| `context` | `() => unknown` | not said | Read on every call and passed to `execute` as `ctx.context`. Only for apps written before tools closed over their own state; new code does not need it. |

## Returns

A `ToolRegistry`:

| Name | Type | Description |
|---|---|---|
| `enable(names)` | `(names: readonly string[]) => () => void` | Enable tools by id (ref-counted). Returns a disposer that releases them once every holder has, after in-flight calls settle. The disposer is idempotent. |
| `update(catalog)` | `(catalog: readonly WebTool[]) => void` | Swap in a new catalog. Only tools whose definition changed re-register; tools that left are released. |
| `enabled()` | `() => readonly string[]` | Ids registered with WebMCP right now, sorted. The same array until it changes. |
| `subscribe(listener)` | `(listener: () => void) => () => void` | Called whenever `enabled()` changes. Returns an unsubscribe function. |
| `destroy()` | `() => void` | Unregister everything now and stop. Later `enable` and `update` calls do nothing. |

## Notes

- Releases are deferred a macrotask, so a release plus a re-enable in the same tick (React StrictMode, a route swap that keeps a tool) never touches WebMCP.
- A released tool with a call in flight stays registered until the call settles plus [`RESPONSE_GRACE_MS`](./defer-release.md), because Chrome cancels a call whose tool is unregistered.
- `enable` with an id that is not in the catalog warns in development and keeps holding it: a later `update` that adds the id registers it.
- A duplicate id in a catalog throws `Duplicate WebTool id "<id>" in catalog`.
- Calls go to whatever definition the catalog holds now, so a new `execute` from `update` needs no re-registration. A change to what WebMCP sees (see [`webToolSignature`](./web-tool-signature.md)) swaps the registration at once, since Chrome would cancel its calls anyway.
- A tool leaves `enabled()` when it is actually unregistered, which is after the deferred release, not when its last holder lets go.

## See also

- [Tools across your app](../../build/tools-across-your-app.mdx), the page that teaches `match` and availability
- [`createWebAgents`](./create-web-agents.md), which owns one for you
- [`registerWebTool`](./register-web-tool.md)
- [`deferRelease`](./defer-release.md) and [`createCallTracker`](./create-call-tracker.md)
- [`matchPath`](./match-path.md)
- [`webToolSignature`](./web-tool-signature.md)
