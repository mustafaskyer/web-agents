/**
 * Field Store's WebTool catalog and where each tool is on:
 *
 *   global            open_product, browse_category, get_cart, open_cart
 *   while the drawer  update_cart_item, remove_from_cart (CartDrawer renders <EnableTools names={drawerTools} />)
 *   is open
 *
 * Declarative forms aren't in the catalog: they register by being on the page
 * (search_products in the header; add_to_cart on a product page; apply_promo
 * and checkout on /checkout; subscribe_newsletter on the home page). So there
 * are no `routes` here: imperative tools are global or component-scoped.
 */
import { removeFromCart, updateCartItem } from "./cartLines";
import { getCart, openCart } from "./getCart";
import { browseCategory, openProduct } from "./openProduct";

export const catalog = [openProduct, browseCategory, getCart, openCart, updateCartItem, removeFromCart];
export const globalTools = ["open_product", "browse_category", "get_cart", "open_cart"];
export const drawerTools = ["update_cart_item", "remove_from_cart"];
