/**
 * The cart drawer. While it's open the agent also gets update_cart_item and
 * remove_from_cart (<EnableTools> below): the tools exist exactly when their
 * controls are on screen.
 *
 * Not a modal <dialog>: showModal() puts it in the top layer, above any
 * z-index, so the agent cursor (and the devtools) would vanish under it. It's a
 * dialog-role panel instead; Root makes the page behind it `inert`, which gives
 * the same focus containment.
 */
import { EnableTools } from "@web-agents/react";
import { useEffect, useId, useRef } from "react";
import { Link } from "react-router";
import { findProduct, money } from "../data/catalog";
import { useCart } from "../store/cart";
import { type CartLine, FREE_SHIPPING_FROM, lineLabel, MAX_QTY } from "../store/cartRules";
import { useUi } from "../store/ui";
import { drawerTools } from "../tools/catalog";
import styles from "./CartDrawer.module.css";
import { EmptyState } from "./EmptyState";
import { CloseIcon, TrashIcon } from "./icons";
import { ProductArt } from "./ProductArt";
import { QtyStepper } from "./QtyStepper";
import { Totals } from "./Totals";

function Line({ line }: { line: CartLine }) {
  const cart = useCart();
  const product = findProduct(line.slug);
  const label = lineLabel(line);
  const max = Math.min(product?.stock ?? MAX_QTY, MAX_QTY);
  return (
    <li className={styles.line} data-line={`${line.slug}:${line.variant ?? ""}`}>
      <div className={styles.thumb}>{product?.images[0] && <ProductArt art={product.images[0]} name={line.name} size="sm" />}</div>
      <div className={styles.info}>
        <p className={styles.name}>{line.name}</p>
        {line.variant && <p className="muted">{line.variant}</p>}
        <QtyStepper
          value={line.qty}
          max={max}
          label={`Quantity of ${label}`}
          // typed numbers are clamped to what's in stock; an empty field waits for a number
          onChange={(qty) => Number.isInteger(qty) && cart.setQty(line.slug, line.variant, Math.min(Math.max(qty, 1), max))}
        />
      </div>
      <div className={styles.end}>
        <p className="tabular">{money(line.unitPrice * line.qty)}</p>
        <button type="button" className="icon-btn" aria-label={`Remove ${label}`} onClick={() => cart.remove(line.slug, line.variant)}>
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}

export function CartDrawer() {
  const cart = useCart();
  const { cartOpen, closeCart } = useUi();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus in on open, back to where it was on close; Escape closes.
  useEffect(() => {
    if (!cartOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus({ preventScroll: true });
    };
  }, [cartOpen, closeCart]);

  const afterDiscount = cart.totals.subtotal - cart.totals.discount;

  return (
    <div className={styles.root} data-open={cartOpen || undefined}>
      <div className={styles.backdrop} onClick={closeCart} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={styles.panel} inert={!cartOpen}>
        {cartOpen && <EnableTools names={drawerTools} />}
        <header className={styles.head}>
          <h2 id={titleId}>
            Your cart{" "}
            <span className="muted tabular">
              ({cart.count} item{cart.count === 1 ? "" : "s"})
            </span>
          </h2>
          <button ref={closeRef} type="button" className="icon-btn" aria-label="Close cart" toolname="close_cart" onClick={closeCart}>
            <CloseIcon />
          </button>
        </header>

        {cart.lines.length === 0 ? (
          <EmptyState
            title="Your cart is empty"
            body="Everything you add shows up here."
            action={
              <Link to="/products" className="btn primary" onClick={closeCart}>
                Browse products
              </Link>
            }
          />
        ) : (
          <>
            <ul className={styles.lines} data-cart-lines="">
              {cart.lines.map((l) => (
                <Line key={`${l.slug}:${l.variant}`} line={l} />
              ))}
            </ul>
            <footer className={styles.foot}>
              <div className={styles.shipping}>
                <p>
                  {cart.totals.shipping === 0
                    ? "Free shipping unlocked"
                    : `${money(FREE_SHIPPING_FROM - afterDiscount)} away from free shipping`}
                </p>
                <div className={styles.progress} aria-hidden="true">
                  <span style={{ transform: `scaleX(${Math.min(1, afterDiscount / FREE_SHIPPING_FROM)})` }} />
                </div>
              </div>
              <Totals totals={cart.totals} promo={cart.promo} />
              <Link to="/checkout" className="btn primary block" onClick={closeCart}>
                Checkout
              </Link>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
