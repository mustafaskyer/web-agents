/**
 * Declarative WebMCP tool: add_to_cart (mounted with a product page)
 *
 * One stable name on every product page: only one product is on screen, so
 * the product is implied and the agent picks the variant and quantity.
 * Adding is reversible, so `toolautosubmit`. The variant is a <select>, so
 * the tool's schema lists the options as an enum. On success the cart drawer
 * opens, after the agent has its answer.
 */
import { errorText } from "@web-agents/core";
import { useToolAnswer } from "@web-agents/react";
import { type FormEvent, useId, useState } from "react";
import { QtyStepper } from "../components/QtyStepper";
import type { Product } from "../data/catalog";
import { useCart } from "../store/cart";
import { MAX_QTY } from "../store/cartRules";
import { useUi } from "../store/ui";
import { afterAnswer } from "../lib/afterAnswer";
import styles from "./forms.module.css";

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

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const event = e.nativeEvent as SubmitEvent;
    const data = new FormData(e.currentTarget);
    try {
      const result = Promise.resolve(cart.add(product.slug, Number(data.get("qty")), String(data.get("variant") ?? "") || null));
      setError(null);
      answer(event, result);
      // the drawer makes this form inert and turns on its own tools: only once the agent has its answer
      afterAnswer(event, result, openCart);
    } catch (err) {
      setError(errorText(err));
      answer(event, Promise.resolve(`Error: ${errorText(err)}`));
    }
  }

  return (
    <form
      className={styles.stack}
      toolname="add_to_cart"
      tooldescription={`Add ${product.name} to the cart.${axis ? ` Pick a ${axis.name.toLowerCase()} first.` : ""}`}
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
            onChange={(e) => {
              setVariant(e.target.value);
              setError(null);
            }}
            aria-invalid={error && !variant ? true : undefined}
            aria-describedby={error ? errorId : undefined}
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
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
