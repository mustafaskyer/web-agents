import { zodResolver } from "@hookform/resolvers/zod";
import { useWebTool } from "@webmcp-agents/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cart } from "@/lib/cart";

const SIZES = ["S", "M", "L"] as const;

// One schema checks the agent's call and the person's submit.
const schema = z.object({
  size: z.enum(SIZES).describe("The size: S, M or L"),
  quantity: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe("How many to add, e.g. 2"),
});

type AddToCartInput = z.infer<typeof schema>;

export function AddToCart() {
  const form = useForm<AddToCartInput>({
    resolver: zodResolver(schema),
    defaultValues: { size: "M", quantity: 1 },
  });

  const add = ({ size, quantity }: AddToCartInput) => {
    cart.add({
      id: `tee-${size}`,
      name: `Ocean Tee (${size})`,
      quantity,
      price: 28,
    });
    return `Added ${quantity} × Ocean Tee, size ${size}.`;
  };

  // An agent calls this.
  useWebTool({
    id: "add_to_cart",
    title: "Add to cart",
    description:
      "Add the Ocean Tee to the cart. On its product page only. " +
      "Next: get_cart, or go_to cart.",
    inputSchema: schema,

    // The size is a custom Select, with nothing to type into: put
    // the agent's values in the form before the cursor presses.
    fill: (values) => form.reset(values),

    execute: add,
  });

  // A person submits this.
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(add)}
        className="flex items-end gap-2"
      >
        <FormField
          control={form.control}
          name="size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Size</FormLabel>
              <Select
                value={field.value}
                onValueChange={(size) => size && field.onChange(size)}
              >
                <FormControl>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  className="w-20"
                  {...field}
                  // A number input hands the form a string.
                  onChange={(e) =>
                    field.onChange(e.target.valueAsNumber)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Add to cart</Button>
      </form>
    </Form>
  );
}
