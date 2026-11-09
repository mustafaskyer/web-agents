# `usePathname`

Returns the browser's current `location.pathname`, kept fresh without patching `history`. It is what [`<WebAgentsProvider>`](./web-agents-provider.md) matches `routes` against when you don't pass `pathname`.

```ts
import { usePathname } from "@webmcp-agents/react";
```

## Signature

```ts
function usePathname(): string;
```

## Parameters

—

## Returns

`string`: `location.pathname`. `"/"` during server rendering.

## Example

From `apps/playground/src/App.tsx`, trimmed. The app has no router: links call `history.pushState` and then dispatch a `popstate`, so browsers without the Navigation API see the change too.

```tsx
import { usePathname, WebAgentsProvider } from "@webmcp-agents/react";

function NavLink({ to, path, children }) {
  function onClick(e) {
    e.preventDefault();
    if (to === path) return;
    history.pushState(null, "", to);
    // pushState fires no event; the Navigation API reports it, but browsers without it need this.
    dispatchEvent(new PopStateEvent("popstate"));
  }
  return <a href={to} onClick={onClick} aria-current={to === path ? "page" : undefined}>{children}</a>;
}

function Shell() {
  const path = usePathname();
  return (
    <WebAgentsProvider tools={catalog} global={GLOBAL_TOOLS} routes={ROUTE_TOOLS} pathname={path}>
      {path === "/orders" ? <Orders /> : <Shop />}
    </WebAgentsProvider>
  );
}
```

## Notes

- Updates come from the Navigation API's `currententrychange` (which also sees `history.pushState`) and from `popstate`.
- Browsers without the Navigation API (the source names Firefox < 147 and older Safari) only see back/forward here. Pass your router's pathname to `<WebAgentsProvider pathname>` instead, as `apps/ecommerce` and `apps/flights` do with React Router's `useLocation()`.
- Works without a provider.

## See also

- [`WebAgentsProvider`](./web-agents-provider.md)
- [`useWebAgents`](./use-web-agents.md) (`pathname`, the value routes actually match)
- [`matchPath`](../core/match-path.md)
