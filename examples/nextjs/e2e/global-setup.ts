import type { FullConfig } from "@playwright/test";

/**
 * Every route the tests visit, so `next dev` compiles each one before the first test navigates there. A tool that
 * navigates (open_product, go_to_page, checkout) otherwise waits on a cold compile, which on a CI runner outlasts the
 * test's URL assertion.
 */
const ROUTES = ["/", "/product/ocean-tee", "/checkout", "/cart"];

export default async function globalSetup(config: FullConfig): Promise<void> {
  const base = config.projects[0]?.use.baseURL;
  if (!base) return;
  for (const route of ROUTES) {
    const res = await fetch(new URL(route, base));
    if (!res.ok) throw new Error(`warming ${route}: HTTP ${res.status}`);
    await res.text();
  }
}
