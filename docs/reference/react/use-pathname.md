---
description: "Returns the browser's current location.pathname, kept fresh without a router: use it to show something that depends on the page (a current-page marker in a navigation)."
---

# `usePathname`

Returns the browser's current `location.pathname`, kept fresh without a router: use it to show something that depends on the page (a current-page marker in a navigation). It follows every client-side router because it is driven by core's URL tracking ([`watchPathname`](../core/watch-pathname.md)). It is the same path the provider tests tools' `match` against, so you rarely need it for tools.

## Import

```ts
import { usePathname } from "@webmcp-agents/react";
```

## Example

Mark the current page in a navigation, with any router.

<include meta='title="components/nav.tsx"'>/_examples/shared/reference/react/use-pathname.tsx</include>

## Options

None. The hook takes no arguments.

## Returns

`string`: `location.pathname`; `"/"` during server rendering. The component re-renders when it changes.

## Notes

- Updates come from the Navigation API's `currententrychange`, or, without it (Firefox before 147, older Safari), from `history.pushState` / `replaceState` (patched only while a component watches), `popstate` and `hashchange`.
- Notices arrive just after the navigation call returns, never inside it (Next.js changes the URL inside a React insertion effect).
- A hash route's path is not `location.pathname`: `usePathname()` stays on the real path. Tools' `match` does read `#/orders` as `/orders`.
- Works without a provider.

## See also

- [Where a tool is on](../../build/where-a-tool-is-on.mdx), how `match` reads the URL
- [`WebAgentsProvider`](./web-agents-provider.md)
- [`useWebAgents`](./use-web-agents.md) (`pathname`, the value tools are matched against)
- [`watchPathname`](../core/watch-pathname.md)
- [`matchPath`](../core/match-path.md)
