"use client";
/**
 * add_to_cart, on a product's page: shadcn's Form on React Hook Form, one schema for the agent's call and the person's
 * submit. The cursor writes the quantity into the Quantity field, visits the Size select (a custom widget: nothing to
 * type into), `fill` puts the size in the form, then it presses "Add to cart" and `add` runs.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { errorText } from "@webmcp-agents/core";
import { useWebTool, WebToolError } from "@webmcp-agents/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cart, MAX_QTY } from "@/lib/cart";
import type { Product } from "@/lib/catalog";

const schema = z.object({
  variant: z.string().optional().describe("The size, one of the product's options (S, M, L). Required when it has sizes."),
  quantity: z.number().int().min(1).max(MAX_QTY).describe("How many to add, e.g. 2"),
});

type AddToCartInput = z.infer<typeof schema>;

export function AddToCartForm({ product }: { product: Product }) {
  const axis = product.variants;

  const form = useForm<AddToCartInput>({
    resolver: zodResolver(schema),
    defaultValues: { variant: undefined, quantity: 1 },
  });

  const add = ({ variant, quantity }: AddToCartInput) => {
    form.clearErrors("root");
    try {
      return cart.add(product.slug, quantity, variant ?? null);
    } catch (err) {
      form.setError("root", { message: errorText(err) });
      throw new WebToolError("invalid_input", errorText(err));
    }
  };

  // An agent calls this.
  useWebTool({
    id: "add_to_cart",
    title: "Add to cart",
    description: `Add ${product.name} to the cart. Only on this product's page (open_product first).${axis ? ` Needs a ${axis.name.toLowerCase()} (${axis.options.join(", ")}): ask the user if they didn't say one.` : ""} Next: keep shopping, or go_to_page checkout.`,
    inputSchema: schema,
    // the Size select is a custom widget: put the agent's pick in the form
    fill: (values) => form.reset(values),
    execute: add,
  });

  // A person submits this.
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((input) => {
          try {
            add(input);
          } catch {
            // shown under the form
          }
        })}
        className="flex flex-col gap-3"
      >
        {axis && (
          <FormField
            control={form.control}
            name="variant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{axis.name}</FormLabel>
                <Select value={field.value ?? null} onValueChange={(v) => field.onChange(v ?? undefined)}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={`Choose a ${axis.name.toLowerCase()}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {axis.options.map((o) => (
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
                    max={Math.min(product.stock, MAX_QTY)}
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
