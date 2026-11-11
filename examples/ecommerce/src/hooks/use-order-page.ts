import { useParams } from "react-router";
import { type LineView, lineView } from "../lib/line-view";
import type { Order } from "../store/cart";
import { useCart } from "./use-cart";
import { useTitle } from "./use-title";

export interface OrderPage {
  order: Order;
  /** "Thanks, Mustafa." */
  firstName: string;
  lines: LineView[];
}

/** /order/:id: a placed order of this visit; null when there is no such order (the page shows Not found). */
export function useOrderPage(): OrderPage | null {
  const { id } = useParams();
  const order = useCart().orders.find((o) => o.id === id);
  useTitle(order ? `Order ${order.id}` : "Not found");
  if (!order) return null;

  return { order, firstName: order.contact.name.split(" ")[0] ?? "", lines: order.lines.map(lineView) };
}
