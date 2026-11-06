import { useState } from "react";
import { Link } from "react-router";
import { EmptyState } from "../components/EmptyState";
import { ProductArt } from "../components/ProductArt";
import { Totals } from "../components/Totals";
import { findProduct, money } from "../data/catalog";
import { useTitle } from "../lib/useTitle";
import { type Order, useCart } from "../store/cart";
import { lineLabel } from "../store/cartRules";
import { ApplyPromoForm } from "../tools/ApplyPromoForm";
import { CheckoutForm } from "../tools/CheckoutForm";
import styles from "./Checkout.module.css";

export function Checkout() {
  const cart = useCart();
  // The placed order: placing it empties the cart, but the page keeps showing it until it moves to the confirmation.
  const [placed, setPlaced] = useState<Order | null>(null);
  useTitle("Checkout");
  const { lines, totals, promo } = placed ?? cart;

  if (lines.length === 0) {
    return (
      <div className="page">
        <h1 className="visually-hidden">Checkout</h1>
        <EmptyState
          title="Your cart is empty"
          body="Add something first, then come back to check out."
          action={
            <Link to="/products" className="btn primary">
              Browse products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className={styles.title}>Checkout</h1>
      <div className={styles.layout}>
        <CheckoutForm total={totals.total} onPlaced={setPlaced} />
        <aside className={styles.summary} aria-labelledby="summary-title">
          <h2 id="summary-title">Order summary</h2>
          <ul className={styles.lines}>
            {lines.map((l) => {
              const art = findProduct(l.slug)?.images[0];
              return (
                <li key={`${l.slug}:${l.variant}`}>
                  <div className={styles.thumb}>
                    {art && <ProductArt art={art} name={l.name} size="sm" />}
                    <span className={`${styles.qty} tabular`}>{l.qty}</span>
                  </div>
                  <p>{lineLabel(l)}</p>
                  <p className="tabular">{money(l.unitPrice * l.qty)}</p>
                </li>
              );
            })}
          </ul>
          {!placed && <ApplyPromoForm />}
          <Totals
            totals={totals}
            promo={promo}
            promoAction={
              !placed && (
                <button type="button" className="link" onClick={cart.removePromo} aria-label={`Remove promo ${promo}`}>
                  Remove
                </button>
              )
            }
          />
        </aside>
      </div>
    </div>
  );
}
