/**
 * Field Store's catalog: the provider's `tools` (`<WebAgentsProvider tools={tools}>` in src/root.tsx). Plain modules
 * with no React: they read the stores (src/store) and navigate with the router (src/lib/navigate.ts), and agents.ts
 * lists them, which the chat's server side (vite.config.ts, api/chat.ts) imports.
 *
 * Every tool of the app, and when it is on:
 *
 * | Tool                 | Where                                                           | On                        |
 * |----------------------|-----------------------------------------------------------------|---------------------------|
 * | open_product         | tools/open-product.ts (this catalog)                            | everywhere                |
 * | browse_category      | tools/browse-category.ts (this catalog)                         | everywhere                |
 * | go_to_page           | tools/go-to-page.ts (this catalog)                              | everywhere                |
 * | get_cart             | tools/get-cart.ts (this catalog)                                | everywhere                |
 * | open_cart            | tools/open-cart.ts (this catalog)                               | everywhere                |
 * | update_cart_item     | tools/update-cart-item.ts, on in hooks/use-cart-drawer-tools.ts | the cart drawer is open   |
 * | remove_from_cart     | tools/remove-from-cart.ts, on in hooks/use-cart-drawer-tools.ts | the cart drawer is open   |
 * | close_cart           | tools/close-cart.ts, on in hooks/use-cart-drawer-tools.ts       | the cart drawer is open   |
 * | search_products      | hooks/use-search-products.ts (`useWebTool`)                     | everywhere (the header)   |
 * | add_to_cart          | hooks/use-add-to-cart.ts (`useWebTool`)                         | a product page, in stock  |
 * | apply_promo          | hooks/use-apply-promo.ts (`useWebTool`)                         | checkout, no code applied |
 * | checkout             | hooks/use-checkout.ts (`useWebTool`)                            | checkout, cart not empty  |
 * | subscribe_newsletter | hooks/use-subscribe-newsletter.ts (`useWebTool`)                | the home page             |
 *
 * Paths are under src/webmcp-agents/. The hooks are what the page's components call (src/components: the header's
 * search box, the product page's add-to-cart form, the checkout forms, the newsletter form, the cart drawer). The
 * drawer's three are defined here but not in the catalog: `useCartDrawerTools(cartOpen)` turns them on with
 * `useWebTool(tool, { enabled: cartOpen })`, and closes the drawer when any other tool starts, so the agent never
 * works on a page hidden behind it.
 */
import { browseCategory } from "./browse-category.ts";
import { closeCart } from "./close-cart.ts";
import { getCart } from "./get-cart.ts";
import { goToPage } from "./go-to-page.ts";
import { openCart } from "./open-cart.ts";
import { openProduct } from "./open-product.ts";
import { removeFromCart } from "./remove-from-cart.ts";
import { updateCartItem } from "./update-cart-item.ts";

export const tools = { openProduct, browseCategory, goToPage, getCart, openCart };

/**
 * What /api/chat lets the model see (api/chat.ts, the Vite dev plugin): the defined tools, pinned (the server sends
 * the model these descriptions, whatever a request says), and the hooks' inline tools by id. A tool not listed here
 * never reaches the model.
 */
export const allowedTools = [
  ...Object.values(tools),
  updateCartItem,
  removeFromCart,
  closeCart,
  "search_products",
  "add_to_cart",
  "apply_promo",
  "checkout",
  "subscribe_newsletter",
];
