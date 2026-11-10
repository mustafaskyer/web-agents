/**
 * Client-side navigation for module-level tools: the App Router's `router.push`, handed over by <Providers> (Next has
 * no router outside React). A tool that navigates this way keeps its call (no page load), and nothing here touches the
 * browser at import (agents.ts imports the tools on the server).
 */
let go: ((to: string) => void) | undefined;

/** Called by <Providers> with the router's push. */
export function setNavigate(navigate: (to: string) => void): void {
  go = navigate;
}

/** Go to `to` within the app; a full page load only if the router isn't there yet. */
export function navigate(to: string): void {
  if (go) go(to);
  else location.assign(to);
}
