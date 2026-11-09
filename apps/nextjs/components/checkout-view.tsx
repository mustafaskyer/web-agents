"use client";
import Link from "next/link";
import { useState } from "react";
import { lineLabel, type Order, useCart } from "@/lib/cart";
import { money } from "@/lib/catalog";
import { ApplyPromoForm } from "@/tools/ApplyPromoForm";
import { CheckoutForm } from "@/tools/CheckoutForm";

export function CheckoutView() {
  const cart = useCart();
  // the placed order: placing it empties the cart, but the page keeps showing it until the agent has its answer
  const [placed, setPlaced] = useState<Order | null>(null);
  const { lines, totals, promo } = placed ?? cart;
  if (lines.length === 0) {
    return (
      <p className="text-muted-foreground">
        Your cart is empty.{" "}
        <Link href="/" className="underline">
          Browse products
        </Link>
      </p>
    );
  }
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <section>
        <h1 className="mb-4 text-2xl font-semibold">Checkout</h1>
        <CheckoutForm total={totals.total} onPlaced={setPlaced} />
      </section>
      <aside className="flex flex-col gap-3 rounded-lg border p-4 text-sm">
        <h2 className="font-medium">Order summary</h2>
        <ul className="flex flex-col gap-1">
          {lines.map((l) => (
            <li key={`${l.slug}:${l.variant}`} className="flex justify-between">
              <span>
                {l.qty} × {lineLabel(l)}
              </span>
              <span>{money(l.unitPrice * l.qty)}</span>
            </li>
          ))}
        </ul>
        {!placed && <ApplyPromoForm />}
        {promo && (
          <p>
            Promo {promo}: −{money(totals.discount)}
          </p>
        )}
        <p>Shipping: {totals.shipping ? money(totals.shipping) : "free"}</p>
        <p className="font-medium">Total {money(totals.total)}</p>
      </aside>
    </div>
  );
}
