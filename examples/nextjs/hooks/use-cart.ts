"use client";
/** The cart for components. The store itself (lib/cart-store.ts) has no React: the catalog tools call it directly. */
import { useSyncExternalStore } from "react";
import { type CartApi, type CartLine, lineLabel, serverSnapshot, snapshot, subscribe } from "@/lib/cart-store";

/** The cart's state, totals and actions, re-rendering on every change (an agent's call included). */
export function useCart(): CartApi {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

/** One cart line as a list shows it. */
export interface CartRow {
  /** Unique per product and variant. */
  key: string;
  slug: string;
  qty: number;
  /** "Ocean Tee (M)". */
  label: string;
  /** Cents: unit price × quantity. */
  total: number;
}

/** The lines as rows, so views render values instead of computing them. */
export function cartRows(lines: readonly CartLine[]): CartRow[] {
  return lines.map((l) => ({
    key: `${l.slug}:${l.variant}`,
    slug: l.slug,
    qty: l.qty,
    label: lineLabel(l),
    total: l.unitPrice * l.qty,
  }));
}
