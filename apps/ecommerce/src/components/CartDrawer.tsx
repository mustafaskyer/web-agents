/**
 * The cart drawer, and the tools that work on it: update_cart_item, remove_from_cart and close_cart are on while it
 * is open (`useWebTool` with `enabled`), so they exist exactly when their controls are on screen. Each line's
 * controls are named after it ("Quantity of Ocean Tee (M)", "Remove Ocean Tee (M)"): a tool's `target` builds that
 * name from the call, and the cursor goes to that line's control. Nothing is added to the markup for the cursor.
 *
 * Not a modal <dialog>: showModal() puts it in the top layer, above any z-index, so the agent cursor (and the
 * devtools) would vanish under it. It's a dialog-role panel instead; Root makes the page behind it `inert`, which
 * gives the same focus containment.
 */
import { useWebTool } from "@webmcp-agents/react";
import { useEffect, useId, useRef } from "react";
import { Link } from "react-router";
import { z } from "zod";
import { findProduct, money } from "../data/catalog";
import { cart as store, useCart } from "../store/cart";
import { type CartLine, FREE_SHIPPING_FROM, findLine, lineLabel, MAX_QTY } from "../store/cartRules";
import { useUi } from "../store/ui";
import styles from "./CartDrawer.module.css";
import { EmptyState } from "./EmptyState";
import { CloseIcon, TrashIcon } from "./icons";
import { ProductArt } from "./ProductArt";
import { QtyStepper } from "./QtyStepper";
import { Totals } from "./Totals";

const lineInput = z.object({
  slug: z.string().describe("The line's product slug, as get_cart lists it, e.g. ocean-tee"),
  variant: z.string().optional().describe("The line's size (S, M, L…), as listed; needed when the cart has the product in several"),
});

function Line({ line }: { line: CartLine }) {
  const cart = useCart();
  const product = findProduct(line.slug);
  const label = lineLabel(line);
  const max = Math.min(product?.stock ?? MAX_QTY, MAX_QTY);
  return (
    <li className={styles.line}>
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
  /** The name a call's line has on screen, as in "Remove Ocean Tee (M)"; a line that isn't in the cart has no control. */
  const labelFor = ({ slug, variant }: { slug: string; variant?: string }) => lineLabel(findLine(cart.lines, slug, variant));

  // ---------- the drawer's tools: on while it is open ----------
  useWebTool(
    {
      id: "update_cart_item",
      title: "Change a cart line's quantity",
      description:
        "Set the quantity of one cart line (0 removes it). Needs: the cart open (open_cart), and the line's slug and size as get_cart or open_cart list them.",
      inputSchema: lineInput.extend({ qty: z.number().int().min(0).max(MAX_QTY).describe("The new quantity, e.g. 2") }),
      repeatable: true,
      // the line's quantity field; the new quantity shows there when the cart re-renders
      target: (input) => ({ role: "spinbutton", name: `Quantity of ${labelFor(input)}` }),
      fields: { qty: false },
      execute: ({ slug, variant, qty }) => store.setQty(slug, variant, qty),
    },
    { enabled: cartOpen },
  );
  useWebTool(
    {
      id: "remove_from_cart",
      title: "Remove a cart line",
      description:
        "Remove one line from the cart. Needs: the cart open (open_cart), and the line's slug and size as get_cart or open_cart list them.",
      inputSchema: lineInput,
      destructive: true,
      // which button? the one a screen reader calls "Remove Ocean Tee (M)"
      target: (input) => ({ role: "button", name: `Remove ${labelFor(input)}` }),
      execute: ({ slug, variant }) => store.remove(slug, variant),
    },
    { enabled: cartOpen },
  );
  useWebTool(
    {
      id: "close_cart",
      title: "Close cart",
      description:
        "Close the cart drawer, back to the page behind it. Use when the user is done with the cart. Only while the cart is open.",
      repeatable: true,
      execute: () => {
        closeCart();
        return "Closed the cart.";
      },
    },
    { enabled: cartOpen },
  );

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
        <header className={styles.head}>
          <h2 id={titleId}>
            Your cart{" "}
            <span className="muted tabular">
              ({cart.count} item{cart.count === 1 ? "" : "s"})
            </span>
          </h2>
          <button ref={closeRef} type="button" className="icon-btn" aria-label="Close cart" onClick={closeCart}>
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
