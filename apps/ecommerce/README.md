# Field Store (`apps/ecommerce`)

A minimal, editorial storefront on mock data where every meaningful action is a WebMCP tool. It shows
the three ways a tool can be on: always (global), while a route is shown (by mounting a form), and
while a component is open (the cart drawer).

```
pnpm --filter @webmcp-agents/example-ecommerce dev    # http://localhost:5174
pnpm --filter @webmcp-agents/example-ecommerce e2e    # Playwright, desktop + Pixel 7
```

Open the devtools (bottom right, Alt+Shift+A) and run a tool, or from the browser console:

```js
await agent.run("open_product", { slug: "ocean-tee" });
await agent.run("add_to_cart", { variant: "M", qty: 2 });     // the cart drawer opens
await agent.run("update_cart_item", { slug: "ocean-tee", qty: 3 });
```

## Tools

| id | kind | on | confirm |
|---|---|---|---|
| `search_products` | declarative (header form) | everywhere | no |
| `open_product` | `defineWebTool` | global | no |
| `browse_category` | `defineWebTool` | global | no |
| `get_cart` | `defineWebTool`, read-only | global | no |
| `open_cart` | `defineWebTool` | global | no |
| `add_to_cart` | declarative | product page (in stock) | no |
| `update_cart_item` | `defineWebTool` | cart drawer open | no |
| `remove_from_cart` | `defineWebTool`, destructive | cart drawer open | no (reversible) |
| `apply_promo` | declarative | checkout | no |
| `checkout` | declarative | checkout, cart not empty | **yes**: the agent fills, the person clicks "Place order" |
| `subscribe_newsletter` | declarative | home page | **yes** |

Promo code `WELCOME10` takes 10% off; shipping is free from $100.

## Notes

- `src/tools/catalog.ts` has the `defineWebTool` tools; Root passes the cart, the drawer state and
  React Router's `navigate` to them as `ctx.context`.
- The cart drawer is a `role="dialog"` panel, not `showModal()`: the top layer would hide the agent
  cursor and block the devtools. The page behind it is `inert` instead.
- Forms that leave the page answer the agent first and navigate after (`src/lib/afterAnswer.ts`), so
  Chrome never cancels a call because its form went away.
- Product art is generated CSS (no image files). The cart lives in `sessionStorage`.
