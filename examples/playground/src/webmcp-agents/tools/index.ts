/**
 * The playground's catalog: the provider's `tools` (`<WebAgentsProvider tools={tools}>` in app.tsx). Plain modules that
 * read the cart store directly, so the provider passes them nothing.
 *
 * Every tool of the app, and when it is on. Paths under webmcp-agents/ unless they start with `src/`; a hook's tool is
 * on while the component that calls it (in brackets) is mounted.
 *
 * | Tool              | Where                                                              | On                             |
 * |-------------------|--------------------------------------------------------------------|--------------------------------|
 * | get_cart          | tools/get-cart.ts (this catalog)                                   | everywhere                     |
 * | list_orders       | tools/list-orders.ts (this catalog, `match`)                       | on /orders                     |
 * | add_to_cart_<sku> | hooks/use-add-to-cart.ts (`useWebTool`) [AddToCartForm]            | always, one per product card   |
 * | clear_cart        | hooks/use-clear-cart.ts (`useWebTool`) [ClearCartButton]           | while the cart has items       |
 * | place_order       | hooks/use-place-order.ts (`useWebTool`) [PlaceOrderButton]         | while the cart has items       |
 * | remove_promo      | hooks/use-remove-promo.ts (`useWebTool`) [RemovePromoButton]       | while an applied code is shown |
 * | apply_promo       | src/components/apply-promo-form.tsx (declarative form), answered   | until a code is applied        |
 * |                   | by hooks/use-apply-promo.ts (`useToolAnswer`)                      |                                |
 */
import { getCart } from "./get-cart";
import { listOrders } from "./list-orders";

export const tools = { getCart, listOrders };
