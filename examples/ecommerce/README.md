# Field Store (`examples/ecommerce`)

A minimal, editorial storefront on mock data where every meaningful action is a WebMCP tool. It shows
the three ways a tool can be on: everywhere (the catalog in `src/webmcp-agents/tools/index.ts`), while a component is
mounted (a form on a page, the open cart drawer), and the one provider line every framework uses:
`<WebAgentsProvider tools={tools}>`.

```
pnpm --filter @webmcp-agents/example-ecommerce dev    # http://localhost:5174
pnpm --filter @webmcp-agents/example-ecommerce e2e    # Playwright, desktop + Pixel 7
```

Every agent and tool lives under `src/webmcp-agents/`: `agents.ts`, `tools/` (one `defineWebTool` per file; `index.ts`
is the catalog and maps where every tool lives) and `hooks/` (where tools are registered: the forms whose tools need
their own state, `useWebTool` inline, and `useCartDrawerTools`, which turns the drawer's tools on). The UI is
shadcn/ui from the examples' shared `@webmcp-agents/examples-ui`, on Tailwind v4.

Business and UI are apart: components (`src/components`) and pages (`src/pages`) only take props and call hooks; the
logic is in hooks, `src/webmcp-agents/hooks/` for those that register a tool (`useAddToCart`, `useSearchProducts`,
`useCheckout`, …) and `src/hooks/` for the rest (`useCart`, `useUi`, each page's `use…Page`, `useTitle`). `store/`,
`data/` and `lib/` are plain modules without React.

Open the devtools (bottom right, Alt+Shift+A) and run a tool, or from the browser console:

```js
await agent.invoke("open_product", { slug: "ocean-tee" });
await agent.invoke("add_to_cart", { variant: "M", qty: 2 });     // the cart drawer opens
await agent.invoke("update_cart_item", { slug: "ocean-tee", qty: 3 });
```

## Tools

| id | where | on | confirm |
|---|---|---|---|
| `search_products` | `useWebTool` in the header's search (types into the field) | everywhere | no |
| `open_product` | catalog, read-only (clicks the product's card when it is listed) | everywhere | no |
| `browse_category` | catalog, read-only (clicks the category's link) | everywhere | no |
| `go_to_page` | catalog (the logo, "All products"; checkout runs unseen) | everywhere | no |
| `get_cart` | catalog, read-only | everywhere | no |
| `open_cart` | catalog, repeatable (the header's cart button) | everywhere | no |
| `add_to_cart` | `useWebTool` + React Hook Form | a product page (in stock) | no |
| `update_cart_item` | `defineWebTool`, on in the drawer (`useWebTool(tool, { enabled })`), repeatable (that line's quantity) | cart drawer open | no |
| `remove_from_cart` | `defineWebTool`, on in the drawer, destructive (that line's Remove button) | cart drawer open | no (reversible) |
| `close_cart` | `defineWebTool`, on in the drawer ("Close cart") | cart drawer open | no |
| `apply_promo` | `useWebTool` + React Hook Form | checkout, no code applied | no |
| `checkout` | `useWebTool` + React Hook Form, `fill` | checkout, cart not empty | **yes**: the cursor types the details and parks on "Place order" until the person clicks |
| `subscribe_newsletter` | `useWebTool` + React Hook Form | home page | **yes** |

Promo code `WELCOME10` takes 10% off; shipping is free from $100.

## Notes

- Nothing in the markup is for the cursor: a tool finds its control by its `title` ("Place order", "Close cart") or
  by a locator `target` built from the call (`` { role: "button", name: `Remove ${label}` } ``), and types each
  parameter into the field with that `name`. The devtools' Tools tab shows what each tool resolves to.
- The cart and the drawer are stores outside React (`src/store/cart.ts`, `src/store/ui.ts`): hooks read them
  with `useCart()` / `useUi()` (`src/hooks/`), catalog tools import them. Catalog tools navigate with the router's own
  `router.navigate` (`src/lib/navigate.ts`, handed over by `main.tsx`), so a navigation never costs a call.
  `src/webmcp-agents/agents.ts` imports the catalog on the server too, so nothing there touches the DOM at import.
- `go_to_page` stays the app's own tool rather than `goTo` from `@webmcp-agents/tools`: checkout has no link to click
  and needs a cart with something in it.
- A tool that leaves its page navigates in `execute`; `useWebTool` keeps it registered until the agent has its answer.
- The cart drawer is a `role="dialog"` panel, not `showModal()`: the top layer would hide the agent
  cursor and block the devtools. The page behind it is `inert` instead.
- Product images are Unsplash photos over a generated gradient tile (the placeholder, and the fallback offline). The cart lives in `sessionStorage`.
