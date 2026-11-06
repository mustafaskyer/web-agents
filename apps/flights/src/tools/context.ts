/**
 * What catalog tools get as `ctx.context`: the provider's `context` prop
 * (see Root.tsx). Module-level tools can't call hooks, so the booking store
 * and navigation reach them this way.
 */
import type { WebToolContext } from "@web-agents/react";
import type { BookingApi } from "../store/booking";

export interface FlightsContext {
  booking: BookingApi;
  /** React Router's navigate: same-document, so no call is lost to a page load. */
  navigate(to: string): void;
}

declare module "@web-agents/core" {
  interface Register {
    context: FlightsContext;
  }
}

/** The provider always passes it; fail loudly if a tool is registered without it. */
export function app(ctx: WebToolContext): FlightsContext {
  if (!ctx.context) throw new Error("The booking store isn't mounted: render the tools inside <WebAgentsProvider context={…}>.");
  return ctx.context;
}
