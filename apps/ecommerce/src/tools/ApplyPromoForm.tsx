/**
 * Declarative WebMCP tool: apply_promo (mounted on /checkout)
 *
 * Cheap and reversible, so `toolautosubmit`. A bad code answers the agent with
 * an error and shows the same text under the field. Applying a code hides the
 * form (the summary shows the code with a Remove link), so it stays for a
 * moment after answering (useToolAnswer) instead of vanishing under the call.
 */
import { errorText } from "@web-agents/core";
import { useToolAnswer } from "@web-agents/react";
import { type FormEvent, useId, useState } from "react";
import { useCart } from "../store/cart";
import styles from "./forms.module.css";

export function ApplyPromoForm() {
  const cart = useCart();
  const { answering, answer } = useToolAnswer();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  if (cart.promo && !answering) return null;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    let message: string;
    try {
      message = cart.applyPromo(String(new FormData(e.currentTarget).get("code") ?? ""));
      setCode("");
      setError(null);
    } catch (err) {
      setError(errorText(err));
      message = `Error: ${errorText(err)}`;
    }
    answer(e.nativeEvent as SubmitEvent, Promise.resolve(message));
  }

  return (
    <form
      toolname="apply_promo"
      tooldescription="Apply a promo code to the cart. The discount shows in the order summary and applies when the order is placed."
      toolautosubmit=""
      onSubmit={onSubmit}
    >
      <div className={styles.inline}>
        <label className="field">
          <span className="visually-hidden">Promo code</span>
          <input
            name="code"
            className="input"
            placeholder="Promo code"
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
            toolparamdescription="The promo code, e.g. WELCOME10"
          />
        </label>
        <button type="submit" className="btn secondary" disabled={!!cart.promo}>
          {cart.promo ? "Applied" : "Apply"}
        </button>
      </div>
      {error && (
        <p id={errorId} className="field-error" role="alert" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
    </form>
  );
}
