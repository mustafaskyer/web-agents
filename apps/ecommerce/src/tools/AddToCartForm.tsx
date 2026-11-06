/**
 * Declarative WebMCP tool: add_to_cart (mounted with a product page)
 *
 * One stable name on every product page: only one product is on screen, so
 * the product is implied and the agent picks the variant and quantity.
 * Adding is reversible, so `toolautosubmit`. The variant is a <select>, so
 * the tool's schema lists the options as an enum. On success the cart drawer
 * opens, after the agent has its answer.
 *
 * An agent that leaves out the size isn't failed: the person is right here.
 * The form highlights the size field and waits for their pick (a page can't
 * open a native dropdown without a real click), then adds and tells the agent
 * what was chosen. No pick within a minute answers the agent to ask instead.
 */
import { errorText } from "@web-agents/core";
import { useToolAnswer } from "@web-agents/react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { QtyStepper } from "../components/QtyStepper";
import type { Product } from "../data/catalog";
import { useCart } from "../store/cart";
import { MAX_QTY } from "../store/cartRules";
import { useUi } from "../store/ui";
import { afterAnswer } from "../lib/afterAnswer";
import styles from "./forms.module.css";

/** How long an agent's add waits for the person to pick the missing option. */
const ASK_TIMEOUT_MS = 60_000;

export function AddToCartForm({ product }: { product: Product }) {
  const cart = useCart();
  const { openCart } = useUi();
  const { answer } = useToolAnswer();
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState("");
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const axis = product.variants;
  const max = Math.min(product.stock, MAX_QTY);
  const selectRef = useRef<HTMLSelectElement>(null);
  // An agent's add waiting for the person to pick the missing option.
  const [asking, setAsking] = useState<{ qty: number; settle(variant: string | null): void } | null>(null);

  /** Add, and the sentence for the agent; the same text shows under the form when it fails. */
  function add(qtyToAdd: number, chosen: string | null): string {
    try {
      const text = cart.add(product.slug, qtyToAdd, chosen);
      setError(null);
      return text;
    } catch (err) {
      setError(errorText(err));
      return `Error: ${errorText(err)}`;
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const event = e.nativeEvent as SubmitEvent;
    const data = new FormData(e.currentTarget);
    const qtyToAdd = Number(data.get("qty"));
    const chosen = String(data.get("variant") ?? "") || null;

    if (event.agentInvoked && axis && !chosen) {
      // ask the person on the page instead of failing the agent
      const result = new Promise<string>((resolve) => {
        const timer = setTimeout(() => settle(null), ASK_TIMEOUT_MS);
        let done = false;
        function settle(picked: string | null): void {
          if (done) return; // a pick, "Not now" or the timeout: whichever comes first
          done = true;
          clearTimeout(timer);
          setAsking(null);
          if (picked === null) {
            resolve(
              `Error: The user didn't choose a ${axis!.name.toLowerCase()}. Ask them which one they want: ${axis!.options.join(", ")}.`,
            );
            return;
          }
          const text = add(qtyToAdd, picked);
          resolve(text.startsWith("Error:") ? text : `${text} The user chose ${axis!.name.toLowerCase()} ${picked}.`);
        }
        setAsking({ qty: qtyToAdd, settle });
      });
      answer(event, result);
      openCartAfter(event, result);
      return;
    }

    const result = Promise.resolve(add(qtyToAdd, chosen));
    answer(event, result);
    openCartAfter(event, result);
  }

  /** On success, open the drawer once the agent has its answer: it makes this form inert and turns on its own tools. */
  function openCartAfter(event: SubmitEvent, result: Promise<string>): void {
    void result.then((text) => {
      if (!text.startsWith("Error:")) afterAnswer(event, Promise.resolve(text), openCart);
    });
  }

  // Asking: put the person on the field.
  useEffect(() => {
    if (asking) selectRef.current?.focus();
  }, [asking]);

  return (
    <form
      className={styles.stack}
      toolname="add_to_cart"
      tooldescription={`Add ${product.name} to the cart. Only on this product's page (open_product first).${axis ? ` Needs a ${axis.name.toLowerCase()} (${axis.options.join(", ")}): ask the user if they didn't say one.` : ""} The cart opens after. Next: keep shopping, or go_to_page checkout.`}
      toolautosubmit=""
      onSubmit={onSubmit}
    >
      {axis && (
        <label className="field">
          <span>{axis.name}</span>
          <select
            name="variant"
            className="input"
            value={variant}
            ref={selectRef}
            required
            data-asking={asking ? "" : undefined}
            onChange={(e) => {
              setVariant(e.target.value);
              setError(null);
              if (asking && e.target.value) asking.settle(e.target.value);
            }}
            aria-invalid={error && !variant ? true : undefined}
            aria-describedby={error || asking ? errorId : undefined}
            toolparamdescription={`${axis.name}: one of ${axis.options.join(", ")}. Required.`}
          >
            <option value="">Choose a {axis.name.toLowerCase()}</option>
            {axis.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className={styles.row}>
        <QtyStepper
          name="qty"
          value={qty}
          max={max}
          onChange={(v) => {
            setQty(v);
            setError(null);
          }}
          paramDescription={`How many to add, 1 to ${max}, e.g. 2`}
        />
        <button type="submit" className="btn primary" style={{ flex: 1 }}>
          Add to cart
        </button>
      </div>
      {asking && axis ? (
        <div id={errorId} className={styles.ask} role="status">
          <p>
            Choose a {axis.name.toLowerCase()} to add {asking.qty} × {product.name}.
          </p>
          <button type="button" className="link" onClick={() => asking.settle(null)}>
            Not now
          </button>
        </div>
      ) : (
        error && (
          <p id={errorId} className="field-error" role="alert">
            {error}
          </p>
        )
      )}
    </form>
  );
}
