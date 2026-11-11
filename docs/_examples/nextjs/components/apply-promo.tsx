"use client";

import { useToolAnswer } from "@webmcp-agents/react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ApplyPromo() {
  const [promo, setPromo] = useState<string | null>(null);
  const { answering, answer } = useToolAnswer();

  // The form goes away once a code is applied, but only after
  // the agent has its answer.
  if (promo && !answering) return <p>Promo {promo} applied.</p>;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code"));
    setPromo(code);

    // Answers an agent's submit; does nothing for a person's.
    answer(
      event.nativeEvent as SubmitEvent,
      Promise.resolve(`Applied ${code}. The cart total updated.`),
    );
  }

  return (
    <form
      toolname="apply_promo"
      tooldescription={
        "Apply a promo code the user gave you to the cart. " +
        "Use before place_order. Never invent a code."
      }
      toolautosubmit=""
      onSubmit={onSubmit}
      className="flex items-end gap-2"
    >
      <Input
        name="code"
        required
        toolparamdescription="The promo code, e.g. WELCOME10"
      />

      <Button type="submit">Apply</Button>
    </form>
  );
}
