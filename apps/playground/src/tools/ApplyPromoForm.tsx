/**
 * Declarative WebMCP tool: apply_promo
 *
 * Applying a code is cheap and reversible, so the form has `toolautosubmit`:
 * the agent fills the code and the browser submits without a pause. A bad
 * code answers the agent with an error and shows the same message under the
 * field, so the person watching sees exactly what the agent was told.
 *
 * Shown (and registered) only while no code is applied; the totals show the
 * applied code with a Remove link that brings this form back. Applying a code
 * hides the form, so it stays for a moment after answering (see useAnswerGrace)
 * instead of vanishing under the agent's pending call.
 */
import { useId, useState, type FormEvent } from "react";
import { errorMessage, useCart } from "../store";
import { useAnswerGrace } from "./useAnswerGrace";

export function ApplyPromoForm() {
  const cart = useCart();
  const { answering, answer } = useAnswerGrace();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  if (cart.promo && !answering) return null;

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
      tooldescription="Apply a promo code to the cart. The discount shows in the cart total and is used when the order is placed."
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
          toolparamdescription="The promo code to apply, e.g. 123"
        />
      </label>
      <button type="submit" disabled={!!cart.promo}>
        {cart.promo ? "Applied" : "Apply"}
      </button>
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
