"use client";
/** Declarative tool: add_to_cart (a product's page). Reversible, so `toolautosubmit`; the variant is a <select> enum. */
import { errorText } from "@webmcp-agents/core";
import { useToolAnswer } from "@webmcp-agents/react";
import { type FormEvent, useState } from "react";
import { MAX_QTY, useCart } from "@/lib/cart";
import type { Product } from "@/lib/catalog";

export function AddToCartForm({ product }: { product: Product }) {
  const cart = useCart();
  const { answer } = useToolAnswer();
  const [error, setError] = useState<string | null>(null);
  const axis = product.variants;
  const max = Math.min(product.stock, MAX_QTY);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    let text: string;
    try {
      text = cart.add(product.slug, Number(data.get("qty")), String(data.get("variant") ?? "") || null);
      setError(null);
    } catch (err) {
      setError(errorText(err));
      text = `Error: ${errorText(err)}`;
    }
    answer(e.nativeEvent as SubmitEvent, Promise.resolve(text));
  }
  return (
    <form
      toolname="add_to_cart"
      tooldescription={`Add ${product.name} to the cart. Only on this product's page (open_product first).${axis ? ` Needs a ${axis.name.toLowerCase()} (${axis.options.join(", ")}): ask the user if they didn't say one.` : ""} Next: keep shopping, or go_to_page checkout.`}
      toolautosubmit=""
      onSubmit={onSubmit}
      className="flex flex-col gap-3"
    >
      {axis && (
        <label className="flex flex-col gap-1 text-sm">
          <span>{axis.name}</span>
          <select
            name="variant"
            required
            toolparamdescription={`${axis.name}: one of ${axis.options.join(", ")}. Required.`}
            className="h-9 rounded-md border bg-background px-2"
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
      <div className="flex gap-2">
        <input
          name="qty"
          type="number"
          min={1}
          max={max}
          defaultValue={1}
          aria-label="Quantity"
          toolparamdescription={`How many to add, 1 to ${max}, e.g. 2`}
          className="h-9 w-20 rounded-md border bg-background px-2 text-sm"
        />
        <button type="submit" className="h-9 flex-1 rounded-md bg-primary px-3 text-sm text-primary-foreground">
          Add to cart
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
