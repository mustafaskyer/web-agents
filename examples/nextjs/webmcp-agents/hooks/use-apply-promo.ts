"use client";
/**
 * apply_promo, on the checkout page: the cursor types the code into Promo code and presses Apply (named "Apply promo
 * code", the tool's title). A bad code is an error for the agent and the same text under the field.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { errorText } from "@webmcp-agents/core";
import { useWebTool, WebToolError } from "@webmcp-agents/react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { z } from "zod";
import { cart } from "@/lib/cart-store";
import { useCart } from "@/hooks/use-cart";

const schema = z.object({
  code: z.string().describe("The promo code, e.g. WELCOME10"),
});

/** The promo form's values. */
export type PromoInput = z.infer<typeof schema>;

/** What the promo form renders and submits. */
export interface ApplyPromo {
  form: UseFormReturn<PromoInput>;
  /** The code already applied: the form gives way to a line saying so, and the tool is off. */
  promo: string | null;
  /** For `form.handleSubmit`: a bad code shows under the field instead of throwing. */
  submit(input: PromoInput): void;
}

/** Registers apply_promo while no code is applied, and returns the form both callers share. */
export function useApplyPromo(): ApplyPromo {
  const { promo } = useCart();
  const form = useForm<PromoInput>({ resolver: zodResolver(schema), defaultValues: { code: "" } });

  const apply = ({ code }: PromoInput) => {
    try {
      return cart.applyPromo(code);
    } catch (err) {
      form.setError("code", { message: errorText(err) });
      throw new WebToolError("invalid_input", errorText(err));
    }
  };

  // An agent calls this, while no code is applied.
  useWebTool(
    {
      id: "apply_promo",
      title: "Apply promo code",
      description: "Apply a promo code the user gave you to the cart. Only on the checkout page (go_to_page checkout first).",
      inputSchema: schema,
      execute: apply,
    },
    { enabled: !promo },
  );

  return {
    form,
    promo,
    submit: (input) => {
      try {
        apply(input);
      } catch {
        // shown under the field
      }
    },
  };
}
