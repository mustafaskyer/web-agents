"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { lineLabel, useCart } from "@/lib/cart";
import { money } from "@/lib/catalog";

export function CartView() {
  const cart = useCart();
  const placed = useSearchParams().get("placed");
  const order = placed ? cart.orders.find((o) => o.id === placed) : undefined;
  return (
    <div className="flex flex-col gap-6">
      {order && (
        <section className="rounded-lg border p-4" aria-live="polite">
          <h1 className="text-xl font-semibold">Order {order.id} placed</h1>
          <p className="text-muted-foreground">
            {money(order.totals.total)}. A confirmation goes to {order.contact.email}.
          </p>
        </section>
      )}
      {!order && <h1 className="text-2xl font-semibold">Your cart</h1>}
      {cart.lines.length === 0 ? (
        <p className="text-muted-foreground">
          {order ? "The cart is empty again." : "The cart is empty."}{" "}
          <Link href="/" className="underline">
            Browse products
          </Link>
        </p>
      ) : (
        <>
          <ul className="divide-y rounded-lg border">
            {cart.lines.map((l) => (
              <li key={`${l.slug}:${l.variant}`} className="flex items-center justify-between gap-4 p-3 text-sm">
                <span>
                  {l.qty} × {lineLabel(l)}
                </span>
                <span className="flex items-center gap-3">
                  {money(l.unitPrice * l.qty)}
                  <button type="button" className="text-muted-foreground underline" onClick={() => cart.remove(l.slug)}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-right font-medium">Total {money(cart.totals.total)}</p>
          <Link href="/checkout" className="self-end rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            Check out
          </Link>
        </>
      )}
    </div>
  );
}
