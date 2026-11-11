/**
 * A product card's form: Qty and "Add to cart". The tool behind it, add_to_cart_<sku>, is `useAddToCart`
 * (webmcp-agents/hooks); the button's accessible name is the tool's title, so the cursor presses this card's button.
 */
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@webmcp-agents/examples-ui/components/form";
import { Input } from "@webmcp-agents/examples-ui/components/input";
import type { Product } from "../hooks/use-products";
import { useAddToCart } from "../webmcp-agents/hooks/use-add-to-cart";

export function AddToCartForm({ product }: { product: Product }) {
  const { form, submit } = useAddToCart(product);

  return (
    <Form {...form}>
      {/* A person submits this. */}
      <form onSubmit={submit} className="flex items-end gap-2">
        <FormField
          control={form.control}
          name="qty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Qty</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  className="w-20"
                  {...field}
                  // A number input hands the form a string.
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="flex-1" aria-label={`Add to cart: ${product.name}`}>
          Add to cart
        </Button>
      </form>
    </Form>
  );
}
