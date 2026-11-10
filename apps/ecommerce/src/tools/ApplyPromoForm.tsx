/**
 * apply_promo, on /checkout: the cursor types the code into the Promo code field and presses Apply (named "Apply promo
 * code", the tool's title). A bad code is an error for the agent and the same text under the field. Applying a code
 * hides the form (the summary shows the code with a Remove link); the tool stays registered until the agent has its
 * answer (`useWebTool` does that).
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { errorText } from "@webmcp-agents/core";
import { useWebTool, WebToolError } from "@webmcp-agents/react";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cart, useCart } from "../store/cart";
import styles from "./forms.module.css";

const schema = z.object({
  code: z.string().describe("The promo code, e.g. WELCOME10"),
});

type PromoInput = z.infer<typeof schema>;

export function ApplyPromoForm() {
  const { promo } = useCart();
  const form = useForm<PromoInput>({ resolver: zodResolver(schema), defaultValues: { code: "" } });
  const error = form.formState.errors.code?.message;
  const errorId = useId();

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

  if (promo) return null;
  // A person submits this.
  return (
    <form
      onSubmit={form.handleSubmit((input) => {
        try {
          apply(input);
        } catch {
          // shown under the field
        }
      })}
    >
      <div className={styles.inline}>
        <label className="field">
          <span className="visually-hidden">Promo code</span>
          <input
            className="input"
            placeholder="Promo code"
            required
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            {...form.register("code", { onChange: () => form.clearErrors("code") })}
          />
        </label>
        <button type="submit" className="btn secondary" aria-label="Apply promo code">
          Apply
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
