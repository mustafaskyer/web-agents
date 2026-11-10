"use client";
/**
 * checkout, on the checkout page: plan example 3. The cursor types the email, name and address, visits the Country
 * select (a custom widget), `fill` puts every value in the form, and the cursor parks on "Place order" until the
 * person clicks it (`requireConfirmation`). Nothing is ordered without a human click.
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
import { cart, type Order } from "@/lib/cart";
import { money } from "@/lib/catalog";
import { navigate } from "@/lib/navigate";

const COUNTRIES = ["Saudi Arabia", "United Arab Emirates", "United States", "United Kingdom", "Germany", "Egypt"] as const;

const checkoutSchema = z.object({
  email: z.email().describe("Email for the receipt"),
  name: z.string().min(1).describe("The recipient's full name"),
  address: z.string().min(1).describe("Street, city and postcode"),
  country: z.enum(COUNTRIES).describe("The country to ship to, e.g. Saudi Arabia"),
});

type CheckoutInput = z.infer<typeof checkoutSchema>;

export function CheckoutForm({ total, onPlaced }: { total: number; onPlaced(order: Order): void }) {
  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { email: "", name: "", address: "", country: "Saudi Arabia" },
  });

  const placeOrder = (contact: CheckoutInput) => {
    let order: Order;
    try {
      order = cart.placeOrder(contact);
    } catch (err) {
      throw new WebToolError("failed", errorText(err));
    }
    onPlaced(order); // the page keeps showing this order until it moves on
    navigate(`/cart?placed=${order.id}`);
    return `Order ${order.id} placed for ${money(order.totals.total)}. A confirmation goes to ${order.contact.email}.`;
  };

  // An agent calls this.
  useWebTool({
    id: "checkout",
    title: "Place order",
    description:
      "Place the order. Needs items in the cart. Only on the checkout page (go_to_page checkout first). Ask the user for an email or address you don't have; never invent them. The user confirms on the page.",
    inputSchema: checkoutSchema,
    requireConfirmation: true,

    // Optional: put every value on screen first (the Select too).
    fill: (values) => form.reset(values),

    execute: placeOrder,
  });

  // A person submits this.
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(placeOrder)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input autoComplete="street-address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg">
          Place order · {money(total)}
        </Button>
      </form>
    </Form>
  );
}
