"use client";
/** Declarative tool: apply_promo (checkout page). Cheap and reversible, so `toolautosubmit`. */
import { errorText } from "@webmcp-agents/core";
import { useToolAnswer } from "@webmcp-agents/react";
import { type FormEvent, useState } from "react";
import { useCart } from "@/lib/cart";

export function ApplyPromoForm() {
  const cart = useCart();
  const { answer, answering } = useToolAnswer();
  const [error, setError] = useState<string | null>(null);
  if (cart.promo && !answering) return <p className="text-sm">Promo {cart.promo} applied.</p>;
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    let text: string;
    try {
      text = cart.applyPromo(String(new FormData(e.currentTarget).get("code") ?? ""));
      setError(null);
    } catch (err) {
      setError(errorText(err));
      text = `Error: ${errorText(err)}`;
    }
    answer(e.nativeEvent as SubmitEvent, Promise.resolve(text));
  }
  return (
    <form
      toolname="apply_promo"
      tooldescription="Apply a promo code the user gave you to the cart. Only on the checkout page (go_to_page checkout first)."
      toolautosubmit=""
      onSubmit={onSubmit}
      className="flex gap-2"
    >
      <input
        name="code"
        placeholder="Promo code"
        aria-label="Promo code"
        toolparamdescription="The code, e.g. WELCOME10"
        className="h-9 rounded-md border bg-background px-2 text-sm"
      />
      <button type="submit" className="h-9 rounded-md border px-3 text-sm">
        Apply
      </button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
