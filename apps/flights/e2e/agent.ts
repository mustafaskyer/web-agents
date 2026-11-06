/** Drive WebMCP tools the way an agent would, through the devtools' `window.agent` (dev only). */
import type { Page } from "@playwright/test";
// `window.agent`: set by the devtools in dev
import type {} from "@web-agents/devtools";

/** Open a page and wait until the devtools have set `window.agent`. */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(() => !!window.agent);
}

/** The tool's text answer; `undefined` when the call threw. */
export function run(page: Page, name: string, args: Record<string, unknown> = {}): Promise<string | undefined> {
  return page.evaluate(
    async ([n, a]) => {
      const result = await window.agent!.run(n, a);
      return result?.content.map((c) => ("text" in c ? c.text : "")).join("\n");
    },
    [name, args] as const,
  );
}

/** Names of the tools registered right now. */
export function list(page: Page): Promise<string[]> {
  return page.evaluate(async () => (await window.agent!.list()).map((t) => t.name).sort());
}
