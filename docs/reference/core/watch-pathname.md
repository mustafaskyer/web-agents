---
description: "Calls a listener whenever the page's URL changes without a page load."
---

# `watchPathname`

Calls a listener whenever the page's URL changes without a page load. It is what [`createWebAgents`](./create-web-agents.md) and [`usePathname`](../react/use-pathname.md) are built on, so nothing in your app has to be wired to a router. Reach for it when your own code must react to navigation.

## Import

```ts
import { watchPathname } from "@webmcp-agents/core";
```

## Example

<include meta='title="watch-url.ts"'>/_examples/shared/reference/core/watch-pathname.ts</include>

## Options

`watchPathname(listener)`.

| Name | Type | Default | Description |
|---|---|---|---|
| `listener` | `() => void` | required | Called after the URL changed, with no arguments: read `location` inside it. The same function subscribed twice is called once. |

## Returns

An unsubscribe function: `() => void`. When the last watcher leaves, everything it added is removed.

## Notes

- It sees `history.pushState` and `replaceState` (so every client-side router), back and forward, and hash changes. With the Navigation API (`currententrychange`) that is one signal; without it (Safari before the API, Firefox before 147) `history.pushState` and `replaceState` are patched for as long as someone watches, and restored when the last watcher leaves.
- Nothing is listened to or patched while no one watches. On the server it does nothing and returns a no-op.
- Listeners are called just after the navigation call returns, once per burst, never inside it: Next.js changes the URL inside a React insertion effect, where telling React about it is an error.
- It fires for every change, including to the same path with a different query string; compare what you care about.
- It does not give the path a tool's `match` is tested against: a hash router's route (`#/orders`) counts as the path for `match`, not for `location.pathname`.

## See also

- [Where a tool is on](../../build/where-a-tool-is-on.mdx), the `match` that follows the URL
- [`createWebAgents`](./create-web-agents.md), which watches for you
- [`usePathname`](../react/use-pathname.md), the same in React
- [`matchPath`](./match-path.md), testing a path against a pattern
