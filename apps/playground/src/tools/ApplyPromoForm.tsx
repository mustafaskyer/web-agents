/**
 * apply_promo: the playground's one declarative form, kept to show the alternative to `useWebTool`. The browser
 * registers a `<form toolname>` by itself: `tooldescription` and `toolparamdescription` describe it, `toolautosubmit`
 * lets the agent submit without a pause, and the submit handler answers through `respondWith`.
 *
 * A bad code answers the agent with an error and shows the same message under the field. Applying a code hides the
 * form (the totals show the code with a Remove button), so it stays for a moment after answering (`useToolAnswer`)
 * instead of vanishing under the agent's pending call: what a tool's `execute` gets for free.
 */
import { useToolAnswer } from "@webmcp-agents/react";
import { type FormEvent, useId, useState } from "react";
import { cart, errorMessage, useCart } from "../store";

export function ApplyPromoForm() {
  const { promo } = useCart();
  const { answering, answer } = useToolAnswer();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  if (promo && !answering) return null;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = String(new FormData(e.currentTarget).get("code") ?? "");

    let message: string;
    try {
      message = cart.applyPromo(input);
      setCode("");
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
      message = `Error: ${errorMessage(err)}`;
    }
    answer(e.nativeEvent as SubmitEvent, Promise.resolve(message));
  }

  return (
    <form
      toolname="apply_promo"
      tooldescription="Apply a promo code the user gave you to the cart, before place_order. The discount shows in the cart total and is used when the order is placed. remove_promo takes it off."
      toolautosubmit=""
      onSubmit={onSubmit}
      className="tool-form promo-form"
    >
      <label>
        Promo code
        <input
          name="code"
          type="text"
          required
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          toolparamdescription="The code exactly as the user gave it, e.g. 123"
        />
      </label>
      <button type="submit" disabled={!!promo}>
        {promo ? "Applied" : "Apply"}
      </button>
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
      <p className="muted declarative-note">
        A declarative form (<code>&lt;form toolname&gt;</code>), the alternative to <code>useWebTool</code>.
      </p>
    </form>
  );
}
