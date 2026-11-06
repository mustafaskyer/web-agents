# web-agents

Helpers for [WebMCP](https://developer.chrome.com/docs/ai/webmcp) pages: make every agent action
visible to the person using the page (a ghost cursor, field replay, a parked "waiting for your
confirmation" state) without the tools knowing it exists, plus the tooling around it.

```
pnpm install
pnpm dev         # apps/playground on http://localhost:5173: open the "Agent console" and hit Run
pnpm check       # biome ci + typecheck + tests + build, everything CI runs
```

Works in any browser thanks to a dev-only polyfill of `document.modelContext`. In a Chrome
build with native WebMCP the polyfill steps aside and the same code runs against the real API.

## Packages

| Package | |
|---|---|
| [`@web-agents/core`](packages/core) | The visual layer: ghost cursor, spotlight, field replay, confirmation parking, yield-to-user, `onAgentEvent`. Framework-agnostic. |
| [`@web-agents/polyfill`](packages/polyfill) | `document.modelContext` polyfill with declarative form tools. |
| [`@web-agents/devtools`](packages/devtools) | Floating panel that lists the page's tools and runs them with JSON args (`window.agent.run`). |

| App | |
|---|---|
| [`apps/playground`](apps/playground) | A storefront where every action is a WebMCP tool: declarative forms, an imperative tool, a confirm-gated checkout. |

Roadmap and per-phase implementation plans live in [`.agents/plans/`](.agents/plans/00-web-agents-roadmap.md).

## The three layers (apps/playground)

```
apps/playground/src/
  tools/              ← PURE. No cursor code anywhere.
    AddToCartForm.tsx    declarative <form toolname="add_to_cart_<sku>" toolautosubmit>
    ApplyPromoForm.tsx   declarative <form toolname="apply_promo" toolautosubmit>   (only "123" is valid)
    CheckoutForm.tsx     declarative <form toolname="place_order">   (no fields, no autosubmit → browser pauses)
    ClearCartButton.tsx  imperative useWebMCP({ name: "clear_cart" }) + <button toolname="clear_cart">
  store.tsx           ← app state (cart)
  main.tsx            ← polyfill (dev) → installAgentVisuals() → render → agent console (dev)
packages/core         ← OUR LOGIC. Event-driven, installed once, never imports a tool.
packages/polyfill     ← dev only: document.modelContext + declarative forms + lifecycle events
packages/devtools     ← dev only: the panel that plays the agent
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

An imperative tool (via `use-webmcp-tool`) is just a hook; the only link to the visual layer
is the `toolname` attribute on the element it acts on:

```jsx
useWebMCP({ name: "clear_cart", description: "…", execute: () => cart.clear() });
<button toolname="clear_cart" onClick={cart.clear}>Clear cart</button>
```

How the visual layer works, its options, yield-to-user and the WebMCP quirks it handles:
[packages/core/README.md](packages/core/README.md).

## Repository

- pnpm workspaces + Turborepo (`turbo run build|typecheck|test|dev`), Biome for lint and format.
- Packages build with tsdown. In this repo, apps and type-checking resolve packages to their
  TypeScript source through the `"@web-agents/source"` export condition, so edits hot-reload
  without a build; published packages use `dist/`.
- Tests: Vitest. `*.test.ts` run in Node; `*.browser.test.ts` run in real Chromium (Vitest
  browser mode + Playwright). First run: `pnpm exec playwright install chromium`.
