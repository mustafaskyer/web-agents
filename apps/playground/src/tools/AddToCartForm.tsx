/**
 * Declarative WebMCP tool: add_to_cart_<sku>
 *
 * Pure. The form knows nothing about cursors or animations:
 *  - `toolname` / `tooldescription` register it with the browser
 *  - `toolautosubmit` lets the agent submit without a confirmation pause
 *    (low-risk, reversible: the Chrome guidance's "add to cart" case)
 *  - the submit handler returns a result to the agent via `respondWith`
 */
import { useState, type FormEvent } from "react";
import { settle, useCart, type Product } from "../store";

export function AddToCartForm({ product }: { product: Product }) {
  const cart = useCart();
  const [qty, setQty] = useState(1);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const native = e.nativeEvent as SubmitEvent; // carries agentInvoked / respondWith
    const result = settle(() => cart.add(product.sku, Number(new FormData(e.currentTarget).get("qty"))));
    if (native.agentInvoked) native.respondWith?.(result);
  }

  return (
    <form
      toolname={`add_to_cart_${product.sku}`}
      tooldescription={`Add ${product.name} to the cart, with a quantity. Use when the user asks for this product. Next: checkout (apply_promo first for a code).`}
      toolautosubmit=""
      onSubmit={onSubmit}
      className="tool-form"
    >
      <label>
        Qty
        <input
          name="qty"
          type="number"
          min="1"
          max="20"
          required
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          toolparamdescription="How many to add, 1–20, e.g. 2"
        />
      </label>
      <button type="submit">Add to cart</button>
    </form>
  );
}
