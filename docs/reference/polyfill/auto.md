# `@webmcp-agents/polyfill/auto`

A side-effect entry: importing it calls [`installWebMCPPolyfill()`](./install-webmcp-polyfill.md), which installs the polyfill if the browser has no WebMCP. Use it when you don't need the returned `ModelContext`.

```ts
import "@webmcp-agents/polyfill/auto";
```

## Signature

```ts
// src/auto.ts
import { installWebMCPPolyfill } from "./index";

installWebMCPPolyfill();
```

## Parameters

—

## Returns

Nothing. The module has no exports.

## Example

The example apps load it in development only, with a dynamic import, before the app module (`apps/playground/src/main.tsx`):

```ts
import "@webmcp-agents/core/cursor.css";

// 1. (dev only) give browsers without native WebMCP a document.modelContext
if (import.meta.env.DEV) {
  await import("@webmcp-agents/polyfill/auto");
}

// 2. the app: <WebAgentsProvider> (App.tsx) installs the agent cursor before its first tool registers
```

## Notes

- Import it before any tool registers. A static `import` runs in module order; the example apps use `await import(…)` so the production bundle doesn't include it, and import the app after it.
- The package declares only this entry as having side effects (`"sideEffects": ["./src/auto.ts", "./dist/auto.js"]`), so bundlers keep it and can drop unused code from the main entry.
- Same behaviour as calling `installWebMCPPolyfill()`: nothing is installed when the browser already has `document.modelContext`, and nothing happens on the server.

## See also

- [`installWebMCPPolyfill`](./install-webmcp-polyfill.md)
- [`PolyfillModelContext`](./polyfill-model-context.md)
