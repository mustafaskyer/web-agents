/**
 * apply_promo, on /checkout while no code is applied: the cursor types the code into the Promo code field and presses
 * Apply (named "Apply promo code", the tool's title). A bad code is an error for the agent and the same text under the
 * field. Applying a code hides the form (the summary shows the code with a Remove link); the tool stays registered
 * until the agent has its answer (`useWebTool` does that).
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { errorText } from "@webmcp-agents/core";
import { useWebTool, WebToolError } from "@webmcp-agents/react";
import type { BaseSyntheticEvent } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { z } from "zod";
import { useCart } from "../../hooks/use-cart";
import { cart } from "../../store/cart";

const schema = z.object({
  code: z.string().describe("The promo code, e.g. WELCOME10"),
});

export type PromoInput = z.infer<typeof schema>;

export interface ApplyPromo {
  form: UseFormReturn<PromoInput>;
  /** A code is applied: the form hides (and the tool is off). */
  applied: boolean;
  /** The person edits the code: the last error goes. */
  clearError(): void;
  /** The form's onSubmit; a bad code shows under the field. */
  submit(e?: BaseSyntheticEvent): Promise<unknown>;
}

/** The promo code form: one `apply` for the agent's call and the person's submit. */
export function useApplyPromo(): ApplyPromo {
  const { promo } = useCart();
  const form = useForm<PromoInput>({ resolver: zodResolver(schema), defaultValues: { code: "" } });

  const apply = ({ code }: PromoInput) => {
    try {
      const text = cart.applyPromo(code);
      form.reset({ code: "" });
      return text;
    } catch (err) {
      form.setError("code", { message: errorText(err) });
      throw new WebToolError("invalid_input", errorText(err));
    }
  };

  // An agent calls this.
  useWebTool(
    {
      id: "apply_promo",
      title: "Apply promo code",
      description:
        "Apply a promo code the user gave you to the cart. Only on the checkout page (go_to_page checkout first). The discount shows in the order summary.",
      inputSchema: schema,
      execute: apply,
    },
    { enabled: !promo },
  );

  return {
    form,
    applied: Boolean(promo),
    clearError: () => form.clearErrors("code"),
    submit: form.handleSubmit((input) => {
      try {
        apply(input);
      } catch {
        // shown under the field
      }
    }),
  };
}
