import { findProduct } from "../data/catalog";
import { type LineView, lineView } from "../lib/line-view";
import { FREE_SHIPPING_FROM, MAX_QTY, type Totals } from "../store/cart-rules";
import { useCart } from "./use-cart";
import { useUi } from "./use-ui";

/** A line in the drawer: what it shows, and the person's two ways to change it. */
export interface DrawerLine extends LineView {
  /** The most the stepper allows: the product's stock, capped at MAX_QTY. */
  max: number;
  /** A typed or stepped quantity: clamped to 1…max; a cleared field (NaN) waits for a number. */
  setQty(qty: number): void;
  remove(): void;
}

export interface CartDrawerState {
  open: boolean;
  close(): void;
  /** Items, not lines. */
  count: number;
  lines: DrawerLine[];
  totals: Totals;
  promo: string | null;
  /** The bar above the totals: free shipping from FREE_SHIPPING_FROM, after the discount. */
  freeShipping: {
    unlocked: boolean;
    /** Cents still to add. */
    remaining: number;
    /** 0–100. */
    progress: number;
  };
}

/** The cart drawer's content and actions. Its tools are turned on by `useCartDrawerTools` (src/webmcp-agents/hooks). */
export function useCartDrawer(): CartDrawerState {
  const cart = useCart();
  const { cartOpen, closeCart } = useUi();
  const afterDiscount = cart.totals.subtotal - cart.totals.discount;

  const lines = cart.lines.map((line): DrawerLine => {
    const max = Math.min(findProduct(line.slug)?.stock ?? MAX_QTY, MAX_QTY);
    return {
      ...lineView(line),
      max,
      setQty: (qty) => {
        if (Number.isInteger(qty)) cart.setQty(line.slug, line.variant, Math.min(Math.max(qty, 1), max));
      },
      remove: () => cart.remove(line.slug, line.variant),
    };
  });

  return {
    open: cartOpen,
    close: closeCart,
    count: cart.count,
    lines,
    totals: cart.totals,
    promo: cart.promo,
    freeShipping: {
      unlocked: cart.totals.shipping === 0,
      remaining: FREE_SHIPPING_FROM - afterDiscount,
      progress: Math.min(100, (afterDiscount / FREE_SHIPPING_FROM) * 100),
    },
  };
}
