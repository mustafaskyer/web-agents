# @web-agents/react

React bindings for WebMCP tools: say once which tools the agent may see, turn them on globally,
per route or per mounted component, and get the agent cursor without any ordering rules.

```sh
pnpm add @web-agents/react @web-agents/core
```

```tsx
import { defineWebTool, EnableTools, useWebTool, WebAgentsProvider } from "@web-agents/react";
import "@web-agents/core/cursor.css";

// Module level (or memoised): the catalog of every tool the app may expose.
const catalog = [getCart, listOrders, removePromo];

<WebAgentsProvider
  tools={catalog}
  global={["get_cart"]}                       // always on
  routes={{ "/orders": ["list_orders"] }}     // on while the pathname matches
  context={cart}                              // reaches execute as ctx.context
  visuals={{ spotlight: true }}               // AgentVisualsOptions, or false
>
  <App />
</WebAgentsProvider>

// In a component: on while it is mounted.
<EnableTools names={["remove_promo"]} />      // or useEnableTools(["remove_promo"])
```

## Writing tool descriptions

A model picks a tool, and the order of calls, from its description alone. Say four things, in this order, in a
sentence or two each:

1. **What it does**, and what it answers ("Open one product's page and answer its price, sizes and stock.").
2. **When to use it** ("Use after search_products or browse_category…").
3. **What it needs first**, when another tool has to run before it or it only exists on some page ("Only on the
   checkout page (go_to_page checkout first).", "Needs: the cart open (open_cart).").
4. **What comes next** ("Next: add_to_cart, which only exists on that page.").

Parameter descriptions say where a value comes from ("the slug as search_products lists it") and its format, with an
example. Tool answers repeat the next step where it helps ("…Use add_to_cart to buy it."), and errors say how to fix
them, with a code the agent can act on: `throw new WebToolError("invalid_input", "No product matches \"x\". Try
search_products.")` (codes in `@web-agents/core`'s README). Ask for what the user didn't give; never invent it. The example apps (`apps/ecommerce/src/tools`,
`apps/flights/src/tools`) follow this throughout.

## Provider props

| Prop | Default | |
|---|---|---|
| `tools` | `[]` | Every catalog `WebTool`. Memoise it or define it at module level; only tools whose definition changed re-register. Duplicate ids throw. |
| `global` | `[]` | Tool ids enabled on every page. |
| `routes` | `{}` | Tool ids per pathname pattern: `/orders`, `/product/:slug`, `/flights/*`, `*`. Every matching pattern contributes. |
| `pathname` | `location.pathname` | The path routes match against. Tracked through the Navigation API (`currententrychange`, which sees `history.pushState`) and `popstate`. In browsers without the Navigation API, pass your router's pathname. |
| `context` | — | App state handed to catalog tools as `ctx.context`, read when a tool runs (always the latest render's value). |
| `visuals` | `{}` | Options for `installAgentVisuals`, read when it installs; `spotlight` and `yieldToUser` also apply on change. `false` installs nothing (tools still work, unanimated). |

Unknown ids in `global`, `routes` or `EnableTools` warn with the catalog's ids instead of throwing.

## Hooks

- `useEnableTools(ids)` / `<EnableTools names={ids} />`: enable catalog tools while mounted. Ref-counted with every other holder.
- `useWebTool(tool, { enabled })`: register a tool that lives in a component and closes over its state. Calls always reach the latest render's `execute`; it re-registers only when what the agent sees changes (id, title, description, schema, annotations, `requireConfirmation`, `target`). Works without a provider. Returns `{ registered, supported }`.
- `useToolAnswer()`: for declarative `<form toolname>` tools whose own action hides them; keeps the form until the agent has its answer. (`useAnswerGrace` is a deprecated alias.)
- `useAgentEvents(listener)`: every agent event (`start`, `fill`, `park`, `result`, `error`, `cancel`, `yield`, `resume`) while mounted.
- `useEnabledTools()`: the catalog ids registered right now.
- `useWebAgents()`: `{ registry, visuals, pathname }` of the nearest provider (`visuals.setSpotlight(…)` at runtime).
- `usePathname()`: the browser's pathname, as the provider tracks it.

The package also types the declarative attributes for JSX: `toolname`, `tooldescription`,
`toolautosubmit`, `toolparamdescription`.

## Typing `ctx.context`

```ts
declare module "@web-agents/core" {
  interface Register {
    context: CartApi;
  }
}
```

## StrictMode, routes and in-flight calls

Chrome cancels a running call when its tool's definition changes or the tool is unregistered.
So nothing here unregisters synchronously: releases wait a macrotask (StrictMode's
mount → unmount → mount, or a route swap that keeps a tool, never touches WebMCP), then until the
tool's calls have settled plus 500 ms for the answer to reach the agent. A tool that turns itself
off (clear_cart emptying the cart) still answers. The visuals are kept across StrictMode's remount
the same way, so tools registered in the first mount stay animated.

## Confirmation

`defineWebTool({ …, requireConfirmation: true })`: the agent's call waits until the person clicks
the tool's element (`target`, default `[toolname="<id>"]`). Only a trusted click counts, and it
runs the tool instead of the element's own `onClick`, so the action happens once. The cursor parks
on the element meanwhile. Input is validated first, so the person never approves a call that then
fails. It fails closed: if the element isn't on the page, is disabled, or goes away while waiting,
the agent gets an error result instead of an unconfirmed run or a call that hangs.
