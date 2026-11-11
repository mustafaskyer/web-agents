/**
 * The store's catalog: the provider's `tools` (`<WebAgentsProvider tools={tools}>` in app/providers.tsx). Plain
 * modules with no React: agents.ts lists them, and the chat route imports agents.ts on the server.
 *
 * Every tool of the app, and when it is on:
 *
 * | Tool              | Where                                                   | On                          |
 * |-------------------|---------------------------------------------------------|-----------------------------|
 * | open_product      | tools/open-product.ts (this catalog)                    | everywhere                  |
 * | go_to_page        | tools/go-to-page.ts (this catalog)                      | everywhere                  |
 * | get_cart          | tools/get-cart.ts (this catalog)                        | everywhere                  |
 * | search_products   | hooks/use-search-products.ts (`useWebTool`), the header | everywhere                  |
 * | add_to_cart       | hooks/use-add-to-cart.ts (`useWebTool`), a product page | a product page              |
 * | apply_promo       | hooks/use-apply-promo.ts (`useWebTool`), checkout       | checkout, no code applied   |
 * | checkout          | hooks/use-checkout.ts (`useWebTool`), checkout          | checkout                    |
 *
 * The hooks own each form and its tool; the forms' UI is in components/ (search-box, add-to-cart-form,
 * apply-promo-form, checkout-form).
 */
import { getCart } from "./get-cart";
import { goToPage } from "./go-to-page";
import { openProduct } from "./open-product";

export const tools = { openProduct, goToPage, getCart };

/**
 * What /api/chat lets the model see (`createVercelChatRoute({ tools })`): the catalog, pinned (the server sends the
 * model these descriptions, whatever a request says), and the hooks' inline tools by id. A tool not listed here
 * never reaches the model.
 */
export const allowedTools = [...Object.values(tools), "search_products", "add_to_cart", "apply_promo", "checkout"];
