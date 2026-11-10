"use client";
/** The cart for components: `useCart()` re-renders on every change. The store itself is lib/cart-store.ts. */
import { useSyncExternalStore } from "react";
import { type CartApi, serverSnapshot, snapshot, subscribe } from "./cart-store";

export * from "./cart-store";

/** The cart's state, totals and actions, re-rendering on every change. */
export function useCart(): CartApi {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
