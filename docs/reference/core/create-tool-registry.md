# `createToolRegistry`

Decides which catalog tools are registered with WebMCP right now. Every part of the app that wants a tool on (a route, a mounted component, the app shell) enables it and gets a disposer; a tool stays registered while anyone holds it. `@webmcp-agents/react`'s `<WebAgentsProvider>` builds on it.

```ts
import { createToolRegistry } from "@webmcp-agents/core";
```

## Signature

```ts
function createToolRegistry(catalog: readonly WebTool[], options?: ToolRegistryOptions): ToolRegistry;

interface ToolRegistryOptions {
  beforeRegister?: () => void;
  context?: () => unknown;
}

interface ToolRegistry {
  enable(names: readonly string[]): () => void;
  update(catalog: readonly WebTool[]): void;
  enabled(): readonly string[];
  subscribe(listener: () => void): () => void;
  destroy(): void;
}
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `catalog` | `readonly WebTool[]` | — | Every tool the app may register. Ids must be unique. |
| `beforeRegister` | `() => void` | — | Called before each WebMCP registration. Install the visuals here so they can gate the tool. |
| `context` | `() => unknown` | — | Read on every call and passed to `execute` as `ctx.context`. |

## Returns

A `ToolRegistry`:

| Method | Description |
|---|---|
| `enable(names)` | Enable tools by id (ref-counted). Returns a disposer that releases them once every holder has, after in-flight calls settle. The disposer is idempotent. |
| `update(catalog)` | Swap in a new catalog. Only tools whose definition changed re-register; tools that left are released. |
| `enabled()` | Ids registered with WebMCP right now, sorted. Same array until it changes. |
| `subscribe(listener)` | Called whenever `enabled()` changes. Returns an unsubscribe function. |
| `destroy()` | Unregister everything now and stop. Later `enable` / `update` calls do nothing. |

## Example

```ts
import { createToolRegistry, installAgentVisuals, matchPath } from "@webmcp-agents/core";
import { catalog } from "./tools/catalog";

let visuals: ReturnType<typeof installAgentVisuals> | undefined;
const registry = createToolRegistry(catalog, {
  beforeRegister: () => (visuals ??= installAgentVisuals()),
  context: () => storeContext,
});

const releaseGlobal = registry.enable(["get_cart", "open_cart", "search_products"]);

// route-scoped tools
let releaseRoute = () => {};
function onRoute(pathname: string) {
  releaseRoute();
  releaseRoute = matchPath("/checkout", pathname) ? registry.enable(["place_order"]) : () => {};
}

registry.subscribe(() => console.debug("enabled:", registry.enabled()));
```

## Notes

- Releases are deferred a macrotask, so a release plus a re-enable in the same tick (React StrictMode, a route swap that keeps a tool) never touches WebMCP.
- A released tool with a call in flight stays registered until the call settles plus [`RESPONSE_GRACE_MS`](./defer-release.md), because Chrome cancels a call whose tool is unregistered.
- `enable` with an id not in the catalog warns in development and keeps holding it: a later `update` that adds the id registers it.
- A duplicate id in a catalog throws `Duplicate WebTool id "<id>" in catalog`.
- Calls go to whatever definition the catalog holds now, so a new `execute` from `update` needs no re-registration. Changes are detected with [`webToolSignature`](./web-tool-signature.md).

## See also

- [`registerWebTool`](./register-web-tool.md)
- [`deferRelease`](./defer-release.md)
- [`createCallTracker`](./create-call-tracker.md)
- [`matchPath`](./match-path.md)
- [`webToolSignature`](./web-tool-signature.md)
