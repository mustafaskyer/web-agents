# Field Store on Next.js (`apps/nextjs`)

The Field Store example on the Next.js App Router with shadcn/ui (base-nova): Server Components render the pages,
client components hold the tools, and the chat is the registry's agent-chat block. It consumes the packages' `dist`
(`predev` builds them).

```
pnpm --filter @webmcp-agents/example-nextjs dev    # http://localhost:5176
pnpm --filter @webmcp-agents/example-nextjs e2e    # Playwright, desktop + Pixel 7
```

In development, `window.agent.invoke("open_product", { slug: "ocean-tee" })` or the devtools panel (Alt+Shift+A).

## Tools

| id | where | on | confirm |
|---|---|---|---|
| `search_products` | `useWebTool` in the header, shadcn `Form` on React Hook Form | everywhere | no |
| `open_product` | catalog (`tools/index.ts`), read-only | everywhere | no |
| `go_to_page` | catalog (the store's name, "Cart (n)"; checkout runs unseen) | everywhere | no |
| `get_cart` | catalog, read-only | everywhere | no |
| `add_to_cart` | `useWebTool`, shadcn `Form` with a `Select` for the size and `fill` | a product page | no |
| `apply_promo` | `useWebTool`, shadcn `Form` | checkout, no code applied | no |
| `checkout` | `useWebTool`, shadcn `Form` with a `Select` for the country and `fill` | checkout | **yes**: the cursor types the details, `fill` sets the country, and it parks on "Place order" until the person clicks |

## Notes

- `app/providers.tsx` has the same provider line as every other app, `<WebAgentsProvider tools={tools}>`: the library
  follows the URL, so there is no `usePathname`, no router hook and no `context`.
- `components/ui/form.tsx` is shadcn's `Form` for React Hook Form in the base-nova style (the base-nova registry ships
  none): the new-york source with Base UI's `useRender` in place of Radix's Slot. `select.tsx` and `label.tsx` are the
  registry's base-nova items.
- A shadcn `Select` is a custom widget: the cursor visits it but has nothing to type into, so a form with one passes
  `fill: (values) => form.reset(values)` to show the agent's values before the click or the confirmation.
- The catalog tools are plain modules with no React (`defineWebTool` from core, the cart store in
  `lib/cart-store.ts`): `agents.ts` lists them by reference and the chat route imports `agents.ts` on the server.
  Components read the cart with `useCart()` (`lib/cart.tsx`). Tools navigate with the App Router's `router.push`,
  handed over by `<Providers>` (`lib/navigate.ts`).
- `app/layout.tsx` imports `@webmcp-agents/core/cursor.css` like any stylesheet. It has no unknown pseudo-classes for
  Turbopack to refuse: Chrome's native `:tool-form-active` / `:tool-submit-active` rules are in the optional
  `cursor-native.css`, which this app doesn't need (the visuals are installed).
- `lib/env.server.ts` taints the API key: a Server Component can't hand it to a client component.
