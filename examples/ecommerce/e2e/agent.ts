/** Drive WebMCP tools the way an agent would, through the devtools' `window.agent` (dev only). */
import { expect, type Locator, type Page } from "@playwright/test";
// `window.agent`'s type: the devtools <WebAgentsProvider> installs in development declare it
import type {} from "@webmcp-agents/react";

/** Open a page and wait until the devtools (installed by the provider in dev) have set `window.agent` and the page's tools are registered. */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(() => !!window.agent);
  // The provider loads the polyfill (Playwright's Chromium has no WebMCP) and the tools register once it is there.
  await expect.poll(() => list(page)).not.toEqual([]);
}

/** The tool's text answer; `undefined` when the call threw. */
export function run(page: Page, name: string, args: Record<string, unknown> = {}): Promise<string | undefined> {
  return page.evaluate(
    async ([n, a]) => {
      const result = await window.agent!.invoke(n, a);
      return result?.content.map((c) => ("text" in c ? c.text : "")).join("\n");
    },
    [name, args] as const,
  );
}

/** Names of the tools registered right now. */
export function list(page: Page): Promise<string[]> {
  return page.evaluate(async () => (await window.agent!.list()).map((t) => t.name).sort());
}

/**
 * A confirm-gated tool is waiting for the person: the cursor is parked (`.is-waiting`) on `control`, the element the
 * tool found. Only a real click on it goes on.
 */
export async function parkedOn(page: Page, control: Locator): Promise<void> {
  await expect(control).toHaveAttribute("data-agent-active", "");
  await expect(page.locator(".agent-cursor.is-waiting")).toHaveCount(1);
}
