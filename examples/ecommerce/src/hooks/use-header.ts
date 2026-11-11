import { allCategories, type Category } from "../data/catalog";
import { useCart } from "./use-cart";
import { useUi } from "./use-ui";

export interface HeaderState {
  /** The shop's links, one per category (browse_category clicks them). */
  categories: readonly Category[];
  /** Items in the cart, for the badge. */
  count: number;
  /** The cart button's name, "Cart, 2 items": open_cart finds the button by it. */
  cartLabel: string;
  openCart(): void;
}

/** What the header on every page shows: the categories, the cart's count and the button that opens it. */
export function useHeader(): HeaderState {
  const { count } = useCart();
  const { openCart } = useUi();

  return {
    categories: allCategories(),
    count,
    cartLabel: `Cart, ${count} item${count === 1 ? "" : "s"}`,
    openCart,
  };
}
