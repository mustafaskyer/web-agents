/** What catalog tools get as `ctx.context`: the cart and the router, from <Providers>. */
import type { WebToolContext } from "@webmcp-agents/react";
import type { CartApi } from "@/lib/cart";

export interface StoreContext {
  cart: CartApi;
  navigate(to: string): void;
}

declare module "@webmcp-agents/core" {
  interface Register {
    context: StoreContext;
  }
}

export function store(ctx: WebToolContext): StoreContext {
  if (!ctx.context) throw new Error("The store isn't mounted: render the tools inside <WebAgentsProvider context={…}>.");
  return ctx.context;
}
