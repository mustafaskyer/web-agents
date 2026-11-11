/**
 * Same-document navigation for module-level tools: React Router's own `router.navigate`, handed over by main.tsx when
 * it creates the router. A tool that navigates this way keeps its call (no page load), and nothing here touches the
 * browser at import (src/webmcp-agents/agents.ts imports the tools server-side).
 */
let go: ((to: string) => void) | undefined;

/** Called once by main.tsx with the router's navigate. */
export function setNavigate(navigate: (to: string) => void): void {
  go = navigate;
}

/** Go to `to` within the app; a full page load only if the router isn't there (never, once the app has started). */
export function navigate(to: string): void {
  if (go) go(to);
  else location.assign(to);
}
