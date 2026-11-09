/**
 * What catalog tools get as `ctx.context`: the provider's `context` prop
 * (see Root in routes.tsx). Module-level tools can't call hooks, so the cart,
 * the drawer and navigation reach them this way.
 */
import type { WebToolContext } from "@webmcp-agents/react";
import type { CartApi } from "../store/cart";
import type { UiApi } from "../store/ui";

export interface StoreContext {
  cart: CartApi;
  ui: UiApi;
  /** React Router's navigate: same-document, so no call is lost to a page load. */
  navigate(to: string): void;
}

declare module "@webmcp-agents/core" {
  interface Register {
    context: StoreContext;
  }
}

/** The provider always passes it; fail loudly if a tool is registered without it. */
export function store(ctx: WebToolContext): StoreContext {
  if (!ctx.context) throw new Error("The store isn't mounted: render the tools inside <WebAgentsProvider context={…}>.");
  return ctx.context;
}
