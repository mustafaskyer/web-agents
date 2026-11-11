"use client";
/** The checkout page's promo form. apply_promo is `useApplyPromo`. */
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@webmcp-agents/examples-ui/components/form";
import { Input } from "@webmcp-agents/examples-ui/components/input";
import { useApplyPromo } from "@/webmcp-agents/hooks/use-apply-promo";

export function ApplyPromoForm() {
  const { form, promo, submit } = useApplyPromo();

  if (promo) return <p className="text-sm">Promo {promo} applied.</p>;
  return (
    <Form {...form}>
      <form
        // A person submits this.
        onSubmit={form.handleSubmit(submit)}
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
