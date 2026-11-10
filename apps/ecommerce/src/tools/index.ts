/**
 * Field Store's app-wide tools: on every page, defined once at module level. They read the stores directly
 * (src/store) and navigate with the router (src/lib/navigate.ts), so the provider passes them nothing.
 *
 * The rest live in the components that own their controls and state (`useWebTool`), on while those are mounted:
 *
 *   header                 search_products (SearchBox)
 *   a product page         add_to_cart (AddToCartForm)
 *   the cart drawer, open  update_cart_item, remove_from_cart, close_cart (CartDrawer)
 *   checkout               apply_promo, checkout (ApplyPromoForm, CheckoutForm)
 *   home                   subscribe_newsletter (NewsletterForm)
 *
 * Any other tool that starts while the drawer is open closes it first (Root), so the agent never works on a page
 * hidden behind it.
 */
import { getCart, openCart } from "./cart.ts";
import { browseCategory, goToPage, openProduct } from "./openProduct.ts";

export const tools = { openProduct, browseCategory, goToPage, getCart, openCart };

/** Tools that work with the drawer open; any other closes it before it runs. */
export const DRAWER_SAFE = new Set(["update_cart_item", "remove_from_cart", "close_cart", "open_cart", "get_cart"]);
