"use client";
/**
 * apply_promo, on the checkout page: the cursor types the code into Promo code and presses Apply (named "Apply promo
 * code", the tool's title). A bad code is an error for the agent and the same text under the field.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { errorText } from "@webmcp-agents/core";
import { useWebTool, WebToolError } from "@webmcp-agents/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cart, useCart } from "@/lib/cart";

const schema = z.object({
  code: z.string().describe("The promo code, e.g. WELCOME10"),
});

type PromoInput = z.infer<typeof schema>;

export function ApplyPromoForm() {
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

  if (promo) return <p className="text-sm">Promo {promo} applied.</p>;
  // A person submits this.
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((input) => {
          try {
            apply(input);
          } catch {
            // shown under the field
          }
        })}
        className="flex items-end gap-2"
      >
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel className="sr-only">Promo code</FormLabel>
              <FormControl>
                <Input placeholder="Promo code" autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" variant="outline" aria-label="Apply promo code">
          Apply
        </Button>
      </form>
    </Form>
  );
}
