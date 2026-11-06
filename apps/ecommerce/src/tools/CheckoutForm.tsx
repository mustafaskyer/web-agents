/**
 * Declarative WebMCP tool: checkout (mounted on /checkout while the cart has items)
 *
 * The agent fills contact and shipping details; there is no `toolautosubmit`,
 * so the browser pauses on "Place order · $…" until the person clicks it. That
 * pause is the confirm gate: nothing is ordered without a human click.
 *
 * Placing the order empties the cart, which would swap this form for the empty
 * state: `onPlaced` hands the page the order to keep showing until the agent
 * has its answer, then the page moves to the order confirmation.
 */
import { errorText } from "@web-agents/core";
import { useToolAnswer } from "@web-agents/react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router";
import { money } from "../data/catalog";
import { afterAnswer } from "../lib/afterAnswer";
import { type Contact, type Order, useCart } from "../store/cart";
import styles from "./forms.module.css";

const COUNTRIES = ["United States", "Canada", "United Kingdom", "Germany", "France", "Netherlands", "Egypt", "Japan", "Australia"];

export function CheckoutForm({ total, onPlaced }: { total: number; onPlaced(order: Order): void }) {
  const cart = useCart();
  const navigate = useNavigate();
  const { answer } = useToolAnswer();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const event = e.nativeEvent as SubmitEvent;
    const form = e.currentTarget;
    // An agent's submit skips the browser's own validation: check, and say which fields are missing.
    const invalid = [...form.querySelectorAll<HTMLInputElement>(":invalid")].filter((el) => el.name);
    if (invalid.length) {
      form.reportValidity();
      answer(event, Promise.resolve(`Error: Fill in ${invalid.map((el) => el.name).join(", ")} first.`));
      return;
    }
    const data = Object.fromEntries(new FormData(form)) as Record<keyof Contact, string>;
    try {
      const order = cart.placeOrder({ ...data, note: data.note || undefined });
      onPlaced(order);
      const result = Promise.resolve(
        `Order ${order.id} placed for ${money(order.totals.total)}. A confirmation goes to ${order.contact.email}.`,
      );
      answer(event, result);
      afterAnswer(event, result, () => void navigate(`/order/${order.id}`));
    } catch (err) {
      answer(event, Promise.resolve(`Error: ${errorText(err)}`));
    }
  }

  return (
    <form
      id="checkout"
      className={styles.stack}
      toolname="checkout"
      tooldescription="Place the order for everything in the cart, shipped to the user's address. Only on the checkout page (go_to_page checkout first). Ask the user for an email or address you don't have; never invent them. The user confirms on the page (Place order)."
      onSubmit={onSubmit}
    >
      <fieldset className={styles.fieldset}>
        <legend>Contact</legend>
        <div className={styles.grid}>
          <label className={`field ${styles.full}`}>
            <span>Email</span>
            <input name="email" type="email" className="input" required autoComplete="email" toolparamdescription="Email for the receipt" />
          </label>
          <label className={`field ${styles.full}`}>
            <span>Full name</span>
            <input name="name" className="input" required autoComplete="name" toolparamdescription="The recipient's full name" />
          </label>
        </div>
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend>Shipping address</legend>
        <div className={styles.grid}>
          <label className={`field ${styles.full}`}>
            <span>Address</span>
            <input name="address" className="input" required autoComplete="street-address" toolparamdescription="Street and number" />
          </label>
          <label className="field">
            <span>City</span>
            <input name="city" className="input" required autoComplete="address-level2" toolparamdescription="City" />
          </label>
          <label className="field">
            <span>Postcode</span>
            <input name="postcode" className="input" required autoComplete="postal-code" toolparamdescription="Postal or ZIP code" />
          </label>
          <label className={`field ${styles.full}`}>
            <span>Country</span>
            <select name="country" className="input" required autoComplete="country-name" defaultValue="United States">
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className={`field ${styles.full}`}>
            <span>Order note (optional)</span>
            <textarea name="note" className="input" rows={2} toolparamdescription="Optional delivery note" />
          </label>
        </div>
      </fieldset>
      <button type="submit" className="btn primary block">
        Place order · <span className="tabular">{money(total)}</span>
      </button>
      <p className="muted" style={{ fontSize: 13, textAlign: "center" }}>
        Demo store: no payment is taken and nothing ships.
      </p>
    </form>
  );
}
