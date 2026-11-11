/**
 * checkout, on /checkout while the cart has items: the agent's contact and shipping details go into the form, and the
 * order is placed only by the person's own click on "Place order · $…" (`requireConfirmation`; the cursor finds the
 * button by the tool's title, which its text starts with). One schema checks the agent's call and the person's submit.
 *
 * Order of an agent's call: the input is checked → the cursor types each field (the ones named like the parameters)
 * and picks the country → `fill` puts every value in the form's state → the cursor parks on Place order → the person
 * clicks → `placeOrder` runs and the page moves to the order.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { errorText } from "@webmcp-agents/core";
import { useWebTool, WebToolError } from "@webmcp-agents/react";
import type { BaseSyntheticEvent } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { z } from "zod";
import { money } from "../../lib/format";
import { navigate } from "../../lib/navigate";
import { cart, type Order } from "../../store/cart";

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "France",
  "Netherlands",
  "Saudi Arabia",
  "United Arab Emirates",
  "Egypt",
  "Japan",
  "Australia",
] as const;

const schema = z.object({
  email: z.email().describe("Email for the receipt"),
  name: z.string().min(1).describe("The recipient's full name"),
  address: z.string().min(1).describe("Street and number"),
  city: z.string().min(1).describe("City"),
  postcode: z.string().min(1).describe("Postal or ZIP code"),
  country: z.enum(COUNTRIES).default("United States").describe("Country, as listed; default United States"),
  note: z.string().optional().describe("Optional delivery note"),
});

export type CheckoutInput = z.input<typeof schema>;

export interface CheckoutOptions {
  /** The page keeps showing the placed order until it moves on. */
  onPlaced(order: Order): void;
}

export interface Checkout {
  form: UseFormReturn<CheckoutInput>;
  /** The Country select's options. */
  countries: readonly string[];
  /** The form's onSubmit: places the order. */
  submit(e?: BaseSyntheticEvent): Promise<unknown>;
}

/** The checkout form: one `placeOrder` for the agent's confirmed call and the person's submit, and the checkout tool. */
export function useCheckout({ onPlaced }: CheckoutOptions): Checkout {
  const form = useForm<CheckoutInput>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", name: "", address: "", city: "", postcode: "", country: "United States", note: "" },
  });

  const placeOrder = (input: CheckoutInput) => {
    let order: Order;
    try {
      order = cart.placeOrder({ ...input, country: input.country ?? "United States", note: input.note || undefined });
    } catch (err) {
      throw new WebToolError("failed", errorText(err));
    }
    onPlaced(order);
    navigate(`/order/${order.id}`);
    return `Order ${order.id} placed for ${money(order.totals.total)}. A confirmation goes to ${order.contact.email}.`;
  };

  // An agent calls this. It runs on the person's click.
  useWebTool({
    id: "checkout",
    title: "Place order",
    description:
      "Place the order for everything in the cart, shipped to the user's address. Only on the checkout page (go_to_page checkout first). Ask the user for an email or address you don't have; never invent them. The user confirms on the page (Place order).",
    inputSchema: schema,
    requireConfirmation: true,

    // every value in the form's state too, before the person confirms
    fill: (values) => form.reset(values),

    execute: placeOrder,
  });

  return { form, countries: COUNTRIES, submit: form.handleSubmit(placeOrder) };
}
