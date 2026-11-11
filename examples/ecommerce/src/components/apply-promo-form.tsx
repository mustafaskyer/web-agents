/** The checkout summary's promo code field and Apply button (apply_promo, `useApplyPromo`); hidden once a code is applied. */
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@webmcp-agents/examples-ui/components/form";
import { Input } from "@webmcp-agents/examples-ui/components/input";
import { useApplyPromo } from "../webmcp-agents/hooks/use-apply-promo";

export function ApplyPromoForm() {
  const { form, applied, clearError, submit } = useApplyPromo();
  if (applied) return null;

  return (
    <Form {...form}>
      {/* A person submits this. */}
      <form onSubmit={submit}>
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Promo code</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    placeholder="Promo code"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    className="h-9"
                    {...field}
                    onChange={(e) => {
                      clearError();
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <Button type="submit" variant="outline" size="lg" aria-label="Apply promo code">
                  Apply
                </Button>
              </div>
              <FormMessage role="alert" />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
