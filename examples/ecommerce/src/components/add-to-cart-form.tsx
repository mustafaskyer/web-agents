/**
 * The product page's form: Size (a native select the cursor writes like a person), Quantity and "Add to cart". The
 * add_to_cart tool and what both callers run live in `useAddToCart`; this renders its state, including the "Choose a
 * size" prompt while an agent waits for the person's pick.
 */
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { Form, FormField, FormItem } from "@webmcp-agents/examples-ui/components/form";
import { Label } from "@webmcp-agents/examples-ui/components/label";
import { NativeSelect, NativeSelectOption } from "@webmcp-agents/examples-ui/components/native-select";
import { useId } from "react";
import type { Product } from "../data/catalog";
import { useAddToCart } from "../webmcp-agents/hooks/use-add-to-cart";
import { QtyStepper } from "./qty-stepper";

export function AddToCartForm({ product }: { product: Product }) {
  const { form, axis, max, error, asking, pick, notNow, clearError, submit } = useAddToCart(product);
  const messageId = useId();
  const sizeId = useId();
  const qtyId = useId();

  return (
    <Form {...form}>
      {/* A person submits this. */}
      <form onSubmit={submit} className="flex flex-col gap-4">
        {axis && (
          <FormField
            control={form.control}
            name="variant"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor={sizeId}>{axis.name}</Label>
                <NativeSelect
                  id={sizeId}
                  required
                  className="w-full [&_select]:h-9 [&_select[data-asking]]:border-ring [&_select[data-asking]]:ring-3 [&_select[data-asking]]:ring-ring/50"
                  data-asking={asking ? "" : undefined}
                  aria-invalid={error && !field.value ? true : undefined}
                  aria-describedby={error || asking ? messageId : undefined}
                  name={field.name}
                  value={field.value ?? ""}
                  onBlur={field.onBlur}
                  onChange={(e) => {
                    const picked = e.target.value || undefined;
                    field.onChange(picked);
                    pick(picked);
                  }}
                  ref={field.ref}
                >
                  <NativeSelectOption value="">Choose a {axis.name.toLowerCase()}</NativeSelectOption>
                  {axis.options.map((o) => (
                    <NativeSelectOption key={o} value={o}>
                      {o}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormItem>
            )}
          />
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor={qtyId}>Quantity</Label>
          <div className="flex gap-3">
            <FormField
              control={form.control}
              name="qty"
              render={({ field }) => (
                <QtyStepper
                  id={qtyId}
                  name={field.name}
                  value={field.value}
                  max={max}
                  onChange={(v) => {
                    field.onChange(v);
                    clearError();
                  }}
                  onBlur={field.onBlur}
                />
              )}
            />

            <Button type="submit" size="lg" className="h-9 flex-1">
              Add to cart
            </Button>
          </div>
        </div>

        {asking && axis ? (
          <div
            id={messageId}
            role="status"
            className="flex items-center justify-between gap-3 rounded-lg border border-ring/40 bg-muted/60 px-3 py-2.5 text-sm"
          >
            <p>
              Choose a {axis.name.toLowerCase()} to add {asking.qty} × {product.name}.
            </p>
            <Button type="button" variant="link" size="sm" onClick={notNow}>
              Not now
            </Button>
          </div>
        ) : (
          error && (
            <p id={messageId} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )
        )}
      </form>
    </Form>
  );
}
