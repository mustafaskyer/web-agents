"use client";
/**
 * Declarative tool: checkout (checkout page). No `toolautosubmit`: the browser pauses on "Place order" until the person
 * clicks it. That pause is the confirm gate: nothing is ordered without a human click.
 */
import { errorText, RESPONSE_GRACE_MS } from "@webmcp-agents/core";
import { useToolAnswer } from "@webmcp-agents/react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { type Contact, type Order, useCart } from "@/lib/cart";
import { money } from "@/lib/catalog";

export function CheckoutForm({ total, onPlaced }: { total: number; onPlaced(order: Order): void }) {
  const cart = useCart();
  const router = useRouter();
  const { answer } = useToolAnswer();
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const event = e.nativeEvent as SubmitEvent;
    const form = e.currentTarget;
    const invalid = [...form.querySelectorAll<HTMLInputElement>(":invalid")].filter((el) => el.name);
    if (invalid.length) {
      form.reportValidity();
      answer(event, Promise.resolve(`Error: Fill in ${invalid.map((el) => el.name).join(", ")} first.`));
      return;
    }
    const data = Object.fromEntries(new FormData(form)) as Record<keyof Contact, string>;
    try {
      const order = cart.placeOrder(data);
      onPlaced(order);
      answer(
        event,
        Promise.resolve(`Order ${order.id} placed for ${money(order.totals.total)}. A confirmation goes to ${order.contact.email}.`),
      );
      // leaving the page unmounts this form: wait until the agent has its answer (Chrome cancels a call whose tool disappears)
      setTimeout(() => router.push(`/cart?placed=${order.id}`), event.agentInvoked ? RESPONSE_GRACE_MS : 0);
    } catch (err) {
      answer(event, Promise.resolve(`Error: ${errorText(err)}`));
    }
  }
  const field = "h-9 rounded-md border bg-background px-2 text-sm";
  return (
    <form
      toolname="checkout"
      tooldescription="Place the order for everything in the cart, shipped to the user's address. Only on the checkout page (go_to_page checkout first). Ask the user for an email or address you don't have; never invent them. The user confirms on the page (Place order)."
      onSubmit={onSubmit}
      className="flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span>Email</span>
        <input name="email" type="email" required autoComplete="email" toolparamdescription="Email for the receipt" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Full name</span>
        <input name="name" required autoComplete="name" toolparamdescription="The recipient's full name" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Address</span>
        <input name="address" required autoComplete="street-address" toolparamdescription="Street, city and postcode" className={field} />
      </label>
      <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
        Place order · {money(total)}
      </button>
    </form>
  );
}
