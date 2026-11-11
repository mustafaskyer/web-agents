import { useToolAnswer } from "@webmcp-agents/react";
import type { FormEvent } from "react";

// A declarative form (the earlier form). Applying a code hides the
// form, so it stays for a moment after the agent's submit.
export function ApplyPromoForm({ applied }: { applied: boolean }) {
  const { answering, answer } = useToolAnswer();

  if (applied && !answering) return null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get("code");
    answer(
      event.nativeEvent as SubmitEvent,
      Promise.resolve(`Applied ${String(code)}.`),
    );
  }

  return (
    <form
      toolname="apply_promo"
      tooldescription="Apply a promo code to the cart."
      toolautosubmit=""
      onSubmit={onSubmit}
    >
      <input
        name="code"
        required
        toolparamdescription="The code, e.g. WELCOME10"
      />
      <button type="submit">Apply</button>
    </form>
  );
}
