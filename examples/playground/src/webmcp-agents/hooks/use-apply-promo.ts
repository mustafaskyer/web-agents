/**
 * apply_promo: the playground's one declarative form, kept to show the alternative to `useWebTool`. The browser
 * registers the `<form toolname>` (components/apply-promo-form.tsx) by itself; this hook is its submit handler, which
 * answers the agent through `respondWith` (`useToolAnswer`).
 *
 * A bad code answers the agent with an error and shows the same message under the field. Applying a code hides the
 * form (the totals show the code with a Remove button), so it stays for a moment after answering (`answering`)
 * instead of vanishing under the agent's pending call: what a tool's `execute` gets for free.
 */
import { errorText } from "@webmcp-agents/core";
import { useToolAnswer } from "@webmcp-agents/react";
import { type FormEvent, useState } from "react";
import { useCart } from "../../hooks/use-cart";
import { cart } from "../../store/cart";

/** What the promo form renders, and its two handlers. */
export interface ApplyPromo {
  /** False once a code is applied and the agent has its answer: the form (and its tool) goes away. */
  shown: boolean;
  /** A code is applied: the button says so and is disabled. */
  applied: boolean;
  /** The field's value. */
  code: string;
  /** Why the last code was refused, shown under the field. */
  error: string | null;
  changeCode: (code: string) => void;
  /** The form's `onSubmit`: an agent's submit and a person's both land here. */
  submit: (event: FormEvent<HTMLFormElement>) => void;
}

/** The declarative apply_promo form's logic: validate and apply the code, answer the agent, keep the field's state. */
export function useApplyPromo(): ApplyPromo {
  const { promo } = useCart();
  const { answering, answer } = useToolAnswer();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function changeCode(next: string) {
    setCode(next);
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = String(new FormData(event.currentTarget).get("code") ?? "");

    let message: string;
    try {
      message = cart.applyPromo(input);
      setCode("");
      setError(null);
    } catch (err) {
      setError(errorText(err));
      // The code first, so the agent and the chat read it as a wrong argument.
      message = `Error [invalid_input]: ${errorText(err)}`;
    }

    // Answers an agent's submit; does nothing for a person's.
    answer(event.nativeEvent as SubmitEvent, Promise.resolve(message));
  }

  return {
    shown: !promo || answering,
    applied: promo !== null,
    code,
    error,
    changeCode,
    submit,
  };
}
