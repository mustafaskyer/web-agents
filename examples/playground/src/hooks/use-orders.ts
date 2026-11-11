import { useCart } from "./use-cart";

/** One past order, ready to show. */
export interface OrderRow {
  id: string;
  total: number;
  promo: string | null;
  /** What was in it, e.g. "3 × Enamel mug, 1 × Logo tee". */
  summary: string;
}

/**
 * The /orders page's data: the orders placed in this session, newest first (the same order list_orders answers in).
 */
export function useOrders(): { orders: OrderRow[] } {
  const { orders } = useCart();

  return {
    orders: orders.toReversed().map((o) => ({
      id: o.id,
      total: o.total,
      promo: o.promo,
      summary: o.items.map((i) => `${i.qty} × ${i.name}`).join(", "),
    })),
  };
}
