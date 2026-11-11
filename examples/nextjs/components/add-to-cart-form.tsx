"use client";
/** The product page's add-to-cart form: shadcn's Form on React Hook Form. add_to_cart is `useAddToCart`. */
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@webmcp-agents/examples-ui/components/form";
import { Input } from "@webmcp-agents/examples-ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@webmcp-agents/examples-ui/components/select";
import type { Product } from "@/lib/catalog";
import { useAddToCart } from "@/webmcp-agents/hooks/use-add-to-cart";

export function AddToCartForm({ product }: { product: Product }) {
  const { form, sizes, maxQty, submit } = useAddToCart(product);

  return (
    <Form {...form}>
      <form
        // A person submits this.
        onSubmit={form.handleSubmit(submit)}
        className="flex flex-col gap-3"
      >
        {sizes && (
          <FormField
            control={form.control}
            name="variant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{sizes.name}</FormLabel>
                <Select value={field.value ?? null} onValueChange={(v) => field.onChange(v ?? undefined)}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={`Choose a ${sizes.name.toLowerCase()}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sizes.options.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex items-end gap-2">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={maxQty}
                    className="w-20"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="flex-1">
            Add to cart
          </Button>
        </div>

        {form.formState.errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
      </form>
    </Form>
  );
}
