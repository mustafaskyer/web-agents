"use client";
/** The checkout page: the checkout form beside the order summary (with the promo form until the order is placed). */
import Link from "next/link";
import { money } from "@/lib/catalog";
import { ApplyPromoForm } from "./apply-promo-form";
import { CheckoutForm } from "./checkout-form";
import { useOrderSummary } from "@/hooks/use-order-summary";

export function CheckoutView() {
  const { rows, totals, promo, empty, placed, onPlaced } = useOrderSummary();
  if (empty) {
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
        <CheckoutForm total={totals.total} onPlaced={onPlaced} />
      </section>
      <aside className="flex flex-col gap-3 rounded-lg border p-4 text-sm">
        <h2 className="font-medium">Order summary</h2>
        <ul className="flex flex-col gap-1">
          {rows.map((row) => (
            <li key={row.key} className="flex justify-between">
              <span>
                {row.qty} × {row.label}
              </span>
              <span>{money(row.total)}</span>
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
