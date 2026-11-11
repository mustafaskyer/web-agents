"use client";
/**
 * The checkout form. checkout is `useCheckout`: the agent's values land in these fields, and the cursor parks on "Place
 * order" until the person clicks it.
 */
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@webmcp-agents/examples-ui/components/form";
import { Input } from "@webmcp-agents/examples-ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@webmcp-agents/examples-ui/components/select";
import type { OrderSummary } from "@/hooks/use-order-summary";
import { money } from "@/lib/catalog";
import { useCheckout } from "@/webmcp-agents/hooks/use-checkout";

export function CheckoutForm({ total, onPlaced }: { total: number; onPlaced: OrderSummary["onPlaced"] }) {
  const { form, countries, submit } = useCheckout(onPlaced);

  return (
    <Form {...form}>
      <form
        // A person submits this.
        onSubmit={form.handleSubmit(submit)}
        className="flex flex-col gap-4"
      >
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
                  {countries.map((c) => (
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
