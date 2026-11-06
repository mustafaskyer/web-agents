import { Link, useParams } from "react-router";
import { CheckIcon } from "../components/icons";
import { money } from "../data/catalog";
import { useTitle } from "../lib/useTitle";
import { useCart } from "../store/cart";
import { lineLabel } from "../store/cartRules";
import { NotFound } from "./NotFound";
import styles from "./OrderConfirmed.module.css";

export function OrderConfirmed() {
  const { id } = useParams();
  const order = useCart().orders.find((o) => o.id === id);
  useTitle(order ? `Order ${order.id}` : "Not found");
  if (!order) return <NotFound />;
  return (
    <div className="page">
      <div className={styles.card}>
        <span className={styles.check}>
          <CheckIcon />
        </span>
        <h1>Order {order.id} confirmed</h1>
        <p className="muted">
          Thanks, {order.contact.name.split(" ")[0]}. A receipt is on its way to {order.contact.email}.
        </p>
        <ul className={styles.lines}>
          {order.lines.map((l) => (
            <li key={`${l.slug}:${l.variant}`}>
              <span>
                {l.qty} × {lineLabel(l)}
              </span>
              <span className="tabular">{money(l.unitPrice * l.qty)}</span>
            </li>
          ))}
          <li className={styles.total}>
            <span>Total{order.promo ? ` (promo ${order.promo})` : ""}</span>
            <span className="tabular">{money(order.totals.total)}</span>
          </li>
        </ul>
        <p className="muted">
          Shipping to {order.contact.address}, {order.contact.postcode} {order.contact.city}, {order.contact.country}.
        </p>
        <Link to="/products" className="btn primary">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
