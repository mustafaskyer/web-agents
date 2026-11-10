/**
 * add_to_cart_<sku>: a tool with input is a form. One schema checks the agent's call and the person's submit (React
 * Hook Form's zod resolver); `add` is what both run. When an agent calls it, the cursor types the quantity into this
 * card's Qty field (the field named `qty`, nearest the button), presses the button, and `add` runs.
 *
 * Three cards each have an "Add to cart" button, so each button's accessible name says which product it adds: that
 * name is the tool's title, and how the cursor finds the right one.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useWebTool } from "@webmcp-agents/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cart, type Product } from "../store";

const schema = z.object({
  qty: z.number().int().min(1).max(20).describe("How many to add, 1–20, e.g. 2"),
});

type AddToCartInput = z.infer<typeof schema>;

export function AddToCartForm({ product }: { product: Product }) {
  const form = useForm<AddToCartInput>({
    resolver: zodResolver(schema),
    defaultValues: { qty: 1 },
  });

  const add = ({ qty }: AddToCartInput) => cart.add(product.sku, qty);

  // An agent calls this.
  useWebTool({
    id: `add_to_cart_${product.sku}`,
    title: `Add to cart: ${product.name}`,
    description: `Add ${product.name} to the cart, with a quantity. Use when the user asks for this product. Next: place_order (apply_promo first for a code).`,
    inputSchema: schema,
    execute: add,
  });

  // A person submits this.
  return (
    <form onSubmit={form.handleSubmit(add)} className="tool-form">
      <label>
        Qty
        <input type="number" min={1} max={20} {...form.register("qty", { valueAsNumber: true })} />
      </label>
      <button type="submit" aria-label={`Add to cart: ${product.name}`}>
        Add to cart
      </button>
    </form>
  );
}
