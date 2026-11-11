"use client";
/** The cart page: the lines with Remove, the total, and the order just placed when checkout lands here. */
import Link from "next/link";
import { money } from "@/lib/catalog";
import { useCartPage } from "@/hooks/use-cart-page";

export function CartView() {
  const { rows, total, order, remove } = useCartPage();
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
      {rows.length === 0 ? (
        <p className="text-muted-foreground">
          {order ? "The cart is empty again." : "The cart is empty."}{" "}
          <Link href="/" className="underline">
            Browse products
          </Link>
        </p>
      ) : (
        <>
          <ul className="divide-y rounded-lg border">
            {rows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-4 p-3 text-sm">
                <span>
                  {row.qty} × {row.label}
                </span>
                <span className="flex items-center gap-3">
                  {money(row.total)}
                  <button type="button" className="text-muted-foreground underline" onClick={() => remove(row.slug)}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-right font-medium">Total {money(total)}</p>
          <Link href="/checkout" className="self-end rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            Check out
          </Link>
        </>
      )}
    </div>
  );
}
