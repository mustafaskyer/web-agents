# `WebAgentsProvider`

One place to say which tools the agent sees. Enabled tools are `global`, plus every `routes` entry that matches the pathname, plus whatever mounted components enable with [`useEnableTools`](./use-enable-tools.md). The provider also installs the agent cursor itself, before the first tool registers, so imperative tools are animated without any ordering rule in the app.

```ts
import { WebAgentsProvider } from "@web-agents/react";
```

## Signature

```ts
function WebAgentsProvider(props: WebAgentsProviderProps): JSX.Element;

interface WebAgentsProviderProps {
  tools?: readonly WebTool[];
  global?: readonly string[];
  routes?: Readonly<Record<string, readonly string[]>>;
  pathname?: string;
  visuals?: AgentVisualsOptions | false;
  context?: RegisteredContext;
  children?: ReactNode;
}
```

## Props

| Name | Type | Default | Description |
|---|---|---|---|
| `tools` | `readonly WebTool[]` | `[]` | Every tool the app may expose (the catalog). Memoise it or define it at module level: a new array re-checks every tool, and only tools whose definition changed re-register. Duplicate ids throw. |
| `global` | `readonly string[]` | `[]` | Tool ids enabled on every page. |
| `routes` | `Readonly<Record<string, readonly string[]>>` | `{}` | Tool ids per route pattern: `/orders`, `/product/:slug`, `/flights/*`, `*`. Every matching pattern contributes. |
| `pathname` | `string` | `location.pathname` | The path routes are matched against. By default it is tracked with [`usePathname`](./use-pathname.md) (Navigation API and `popstate`). |
| `visuals` | `AgentVisualsOptions \| false` | `{}` | Options for [`installAgentVisuals`](../core/install-agent-visuals.md), read when it installs. `spotlight` and `yieldToUser` also apply when they change. `false` installs nothing: tools still register, without animation. |
| `context` | `RegisteredContext` | — | App state handed to every catalog tool's `execute` as `ctx.context`. Read when a tool runs, so it is always the latest render's value. Type it through the `Register` interface. |
| `children` | `ReactNode` | — | The app. |

Route patterns use [`matchPath`](../core/match-path.md): literal segments, `:param` (exactly one segment) and a trailing `*` (the rest, possibly empty). Trailing slashes don't matter; case does. `"*"` alone matches every path.

## Returns

A context provider. Descendants read it with [`useWebAgents`](./use-web-agents.md).

## Example

From `apps/ecommerce/src/Root.tsx`, trimmed. The router's pathname is passed in, because React Router's `pushState` is invisible without the Navigation API.

```tsx
import { WebAgentsProvider } from "@web-agents/react";
import { useLocation, useNavigate } from "react-router";
import { catalog, globalTools } from "./tools/catalog";

const VISUALS = { spotlight: false };

function Shell() {
  const cart = useCart();
  const ui = useUi();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const context = useMemo(() => ({ cart, ui, navigate: (to) => void navigate(to) }), [cart, ui, navigate]);

  return (
    <WebAgentsProvider tools={catalog} global={globalTools} pathname={pathname} context={context} visuals={VISUALS}>
      <Outlet />
    </WebAgentsProvider>
  );
}
```

Typing `ctx.context`:

```ts
declare module "@web-agents/core" {
  interface Register {
    context: CartApi;
  }
}
```

## Notes

- Nothing is unregistered synchronously. Chrome cancels a running call when its tool's definition changes or the tool is unregistered, so releases wait a macrotask (StrictMode's mount, unmount, mount, or a route swap that keeps a tool, never touches WebMCP), then until the tool's calls have settled, plus 500 ms (`RESPONSE_GRACE_MS`) for the answer to reach the agent. A tool that turns itself off still answers.
- The cursor is kept across StrictMode's remount the same way: its teardown is deferred a macrotask, so tools registered in the first mount stay animated.
- Unknown ids in `global`, `routes` or `EnableTools` warn (outside `NODE_ENV=production`) with the catalog's ids instead of throwing. They register if a later `tools` update adds them.
- A changed definition (id, title, description, schema, annotations, `requireConfirmation`, `target`) re-registers at once. A changed `execute` does not: calls always go to the definition the catalog holds now.
- `visuals` options other than `spotlight` and `yieldToUser` are only read at install. Inline objects are fine for those two: they are compared by value.
- In browsers without the Navigation API, pass your router's pathname. The default only sees back/forward there.

## See also

- [`useEnableTools` / `EnableTools`](./use-enable-tools.md)
- [`useWebTool`](./use-web-tool.md)
- [`useWebAgents`](./use-web-agents.md)
- [`defineWebTool`](../core/define-web-tool.md)
- [`createToolRegistry`](../core/create-tool-registry.md)
- [`installAgentVisuals`](../core/install-agent-visuals.md)
