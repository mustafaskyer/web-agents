/** /orders: past orders. The agent sees `list_orders` only on this page: its `match` (tools/index.ts). */
import { money, useCart } from "./store";

export function Orders() {
  const { orders } = useCart();
  return (
    <section className="catalog">
      <h1>Orders</h1>
      {orders.length === 0 ? (
        <p className="muted">No orders yet. Orders you place from the cart show up here.</p>
      ) : (
        <ol className="orders">
          {orders.toReversed().map((o) => (
            <li key={o.id} className="card">
              <h3>
                {o.id} <span className="muted">· {money(o.total)}</span>
              </h3>
              <p className="muted">
                {o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}
                {o.promo ? ` · promo ${o.promo}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
