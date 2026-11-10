---
description: "A side-effect entry: importing it calls installWebMCPPolyfill(), which installs the polyfill if the browser has no WebMCP."
---

# `@webmcp-agents/core/polyfill/auto`

A side-effect entry: importing it calls [`installWebMCPPolyfill()`](./install-webmcp-polyfill.md), which installs the polyfill if the browser has no WebMCP. An app with [`<WebAgentsProvider>`](../react/web-agents-provider.md) or [`createWebAgents`](../core/create-web-agents.md) does not need it: they load the polyfill themselves. Use it on a page that registers tools without them.

## Import

```ts
import "@webmcp-agents/core/polyfill/auto";
```

## Example

A page whose tools are only declarative forms, with no provider: the polyfill finds the forms once it is installed.

```ts src/main.ts
// Browsers without WebMCP get document.modelContext, which
// registers every <form toolname> on the page.
import "@webmcp-agents/core/polyfill/auto";
```

## Options

None. The module has no exports and takes no options.

## Returns

Nothing.

## Notes

- Import it before any tool registers: a static `import` runs in module order.
- A static import puts the polyfill in your main bundle for every browser. To load it only where the browser has no WebMCP, call [`loadWebMCPPolyfill`](../core/load-webmcp-polyfill.md) instead.
- The package declares this entry as having side effects (`"sideEffects"` lists `./src/polyfill/auto.ts` and `./dist/polyfill/auto.js`), so bundlers keep it.
- Same behaviour as calling `installWebMCPPolyfill()`: nothing is installed when the browser already has `document.modelContext`, and nothing happens on the server.
- `@webmcp-agents/polyfill/auto` (deprecated) imports this entry, so code written against it keeps working.

## See also

- [Browsers without WebMCP](../../more/polyfill.mdx)
- [`loadWebMCPPolyfill`](../core/load-webmcp-polyfill.md)
- [`installWebMCPPolyfill`](./install-webmcp-polyfill.md)
- [`PolyfillModelContext`](./polyfill-model-context.md)
