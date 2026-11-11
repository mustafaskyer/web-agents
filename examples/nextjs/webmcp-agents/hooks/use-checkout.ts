"use client";
/**
 * checkout, on the checkout page. The cursor types the email, name and address, visits the Country select (a custom
 * widget), `fill` puts every value in the form, and the cursor parks on "Place order" until the person clicks it
 * (`requireConfirmation`). Nothing is ordered without a human click.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { errorText } from "@webmcp-agents/core";
import { useWebTool, WebToolError } from "@webmcp-agents/react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { z } from "zod";
import { cart, type Order } from "@/lib/cart-store";
import { money } from "@/lib/catalog";
import { navigate } from "@/lib/navigate";

const COUNTRIES = ["Saudi Arabia", "United Arab Emirates", "United States", "United Kingdom", "Germany", "Egypt"] as const;

const checkoutSchema = z.object({
  email: z.email().describe("Email for the receipt"),
  name: z.string().min(1).describe("The recipient's full name"),
  address: z.string().min(1).describe("Street, city and postcode"),
  country: z.enum(COUNTRIES).describe("The country to ship to, e.g. Saudi Arabia"),
});

/** The checkout form's values. */
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** What the checkout form renders and submits. */
export interface Checkout {
  form: UseFormReturn<CheckoutInput>;
  /** The Country select's options. */
  countries: readonly string[];
  /** For `form.handleSubmit`: places the order and moves to the cart page. */
  submit(input: CheckoutInput): void;
}

/**
 * Registers checkout and returns the form both callers share. `onPlaced` gets the order before the page moves on, so
 * the summary can keep showing it (placing empties the cart).
 */
export function useCheckout(onPlaced: (order: Order) => void): Checkout {
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
    onPlaced(order);
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

  return {
    form,
    countries: COUNTRIES,
    submit: (input) => {
      placeOrder(input);
    },
  };
}
