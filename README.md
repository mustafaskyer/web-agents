# web-agents

Helpers for [WebMCP](https://developer.chrome.com/docs/ai/webmcp) pages: make every agent action
visible to the person using the page (a ghost cursor, field replay, a parked "waiting for your
confirmation" state) without the tools knowing it exists, plus the tooling around it.

```
pnpm install
pnpm dev         # every app: playground :5173, ecommerce :5174, flights :5175. Open the devtools (bottom right, Alt+Shift+A) and run a tool
pnpm check       # biome ci + typecheck + tests + build, everything CI runs
pnpm e2e         # Playwright end-to-end tests of the example apps (desktop + mobile)
# chat: put ANTHROPIC_API_KEY in apps/<app>/.env.local (see .env.example), then open the Assistant bottom-left
```

Works in any browser thanks to a dev-only polyfill of `document.modelContext`. In a Chrome
build with native WebMCP the polyfill steps aside and the same code runs against the real API.

## Packages

API reference, one file per API: [docs/](docs/README.md), also built as a searchable site by
[`apps/docs`](apps/docs/README.md) (`pnpm --filter @webmcp-agents/docs dev`).

| Package | |
|---|---|
| [`@webmcp-agents/core`](packages/core) | The visual layer (ghost cursor, spotlight, field replay, confirmation parking, yield-to-user, `onAgentEvent`), `defineWebTool` and the tool registry. Framework-agnostic. |
| [`@webmcp-agents/react`](packages/react) | `<WebAgentsProvider>` (global / route / component-scoped tools), `useWebTool`, `useEnableTools`, `useToolAnswer`, JSX types for the WebMCP attributes. |
| [`@webmcp-agents/polyfill`](packages/polyfill) | `document.modelContext` polyfill with declarative form tools. |
| [`@webmcp-agents/chat`](packages/chat) | `<AgentChat>`: a chat widget whose agent (Claude on your server, or a custom `AgentAdapter`) works the live page through its WebMCP tools; `/api/chat` handler and a Vite dev plugin. |
| [`@webmcp-agents/local-agent`](packages/local-agent) | An on-device `AgentAdapter`: Chrome's built-in model, or a small Qwen3 model in a Web Worker (transformers.js, WebGPU/WASM). Opt-in download; nothing leaves the browser. |
| [`@webmcp-agents/devtools`](packages/devtools) | Devtools panel: the page's tools with a generated form per schema, a timeline of every call (yours or an agent's), cursor settings. Floating, `<WebAgentsDevtools />` or a TanStack Devtools tab. Keeps `window.agent.run`. |

| App | |
|---|---|
| [`apps/playground`](apps/playground) | A storefront where every action is a WebMCP tool: declarative forms, global / route / component-scoped WebTools, confirm-gated checkout and clear-cart. |

## Examples

Two realistic sites on mock data, with React Router 7. Each shows global, route-scoped and
component-scoped tools, declarative forms and `defineWebTool` tools, and a confirm gate on the
consequential step. Each app's README has its tool table.

| App | Port | |
|---|---|---|
| [`apps/ecommerce`](apps/ecommerce) | 5174 | **Field Store**: catalogue, product pages, a cart drawer whose tools exist only while it's open, checkout. |
| [`apps/flights`](apps/flights) | 5175 | **Skyline**: flight search, results with filters and sort, traveler details, booking and look-up. |

`pnpm --filter @webmcp-agents/example-ecommerce dev` (or `…-flights`) runs one app on its own.

Roadmap and per-phase implementation plans live in [`.agents/plans/`](.agents/plans/00-web-agents-roadmap.md).

## The three layers (apps/playground)

```
apps/playground/src/
  tools/              ← PURE. No cursor code anywhere.
    AddToCartForm.tsx    declarative <form toolname="add_to_cart_<sku>" toolautosubmit>
    ApplyPromoForm.tsx   declarative <form toolname="apply_promo" toolautosubmit>   (only "123" is valid)
    CheckoutForm.tsx     declarative <form toolname="place_order">   (no fields, no autosubmit → browser pauses)
    ClearCartButton.tsx  useWebTool(clear_cart, requireConfirmation) + <button toolname="clear_cart">
    catalog.ts           defineWebTool: get_cart (global), list_orders (/orders), remove_promo (while shown)
  App.tsx             ← <WebAgentsProvider tools={catalog} global routes context={cart}> (installs the cursor)
  store.tsx           ← app state (cart)
  main.tsx            ← polyfill (dev) → render
  Devtools.tsx        ← dev only, lazy: <WebAgentsDevtools /> (or the TanStack tab with ?tanstack)
packages/core         ← OUR LOGIC. Event-driven, installed once, never imports a tool.
packages/react        ← provider + hooks: which tools are on, registered without churn
packages/polyfill     ← dev only: document.modelContext + declarative forms + lifecycle events
packages/devtools     ← dev only: the panel that plays the agent and records every call
```

A declarative tool is just a form with two attributes. Its submit handler answers the agent
through `respondWith`:

```jsx
<form toolname={`add_to_cart_${sku}`} tooldescription="Add … to the cart" toolautosubmit="" onSubmit={onSubmit}>
  <input name="qty" type="number" min="1" toolparamdescription="How many to add" />
  <button type="submit">Add to cart</button>
</form>

function onSubmit(e) {
  e.preventDefault();
  const result = Promise.resolve(cart.add(sku, qty));
  if (e.nativeEvent.agentInvoked) e.nativeEvent.respondWith(result);
}
```

An imperative tool is a `WebTool`: one definition, typed by its schema (zod, valibot, arktype or
plain JSON Schema), shaped like a Mastra / AI SDK tool so a server agent can reuse it. The
provider decides when the agent sees it; the only link to the visual layer is still the
`toolname` attribute (or the tool's `target` selector) on the element it acts on:

```tsx
const listOrders = defineWebTool({
  id: "list_orders",
  description: "List past orders",
  inputSchema: z.object({ limit: z.number().int().optional() }),
  execute: ({ limit }, ctx) => ctx.context!.orders.slice(0, limit),
});

<WebAgentsProvider tools={[getCart, listOrders, removePromo]} global={["get_cart"]} routes={{ "/orders": ["list_orders"] }} context={cart}>
  …
  <EnableTools names={["remove_promo"]} />   {/* on while this component is mounted */}
</WebAgentsProvider>
```

A tool bound to component state uses `useWebTool`; `requireConfirmation` makes the agent wait for
the person's click on the element (the cursor parks there):

```tsx
const tool = useMemo(() => defineWebTool({ id: "clear_cart", description: "…", requireConfirmation: true, execute: () => cart.clear() }), [cart]);
useWebTool(tool, { enabled: cart.items.length > 0 });
<button toolname="clear_cart" onClick={cart.clear}>Clear cart</button>
```

Tools registered by other libraries (e.g. `use-webmcp-tool`) still animate: the visual layer
wraps `registerTool` whoever calls it. See [packages/react/README.md](packages/react/README.md).

How the visual layer works, its options, yield-to-user and the WebMCP quirks it handles:
[packages/core/README.md](packages/core/README.md).

## Deploy your own

Each example app deploys as its own Vercel project with a guarded `/api/chat` (origin allow-list, per-IP rate limits,
a daily budget). Steps and the env var table: [docs/deploy.md](docs/deploy.md). Live demos: _coming with the first
deploy_.

## Repository

- pnpm workspaces + Turborepo (`turbo run build|typecheck|test|dev`), Biome for lint and format.
- CI (`.github/workflows/ci.yml`): Biome, typecheck, unit + browser tests, build, size budgets, publint +
  are-the-types-wrong (`check-exports`), then Playwright e2e. Releases: Changesets (`pnpm changeset`), published by
  `.github/workflows/release.yml`.
- Packages build with tsdown. In this repo, apps and type-checking resolve packages to their
  TypeScript source through the `"@webmcp-agents/source"` export condition, so edits hot-reload
  without a build; published packages use `dist/`.
- Tests: Vitest. `*.test.ts` run in Node; `*.browser.test.ts` run in real Chromium (Vitest
  browser mode + Playwright). First run: `pnpm exec playwright install chromium`. The example apps
  add Playwright e2e tests in `apps/*/e2e` (`pnpm e2e`), which drive tools through `window.agent`.
