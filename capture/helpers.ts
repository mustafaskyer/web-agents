/** Shared by the capture specs: drive tools through the devtools' `window.agent`, name output files, pause for frames. */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Page, TestInfo } from "@playwright/test";
import type {} from "@webmcp-agents/devtools";

export const OUT = join(import.meta.dirname, "out");

/** Open a page and wait until the devtools have set `window.agent` and the tools have registered. */
export async function open(page: Page, url: string, tool?: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => !!window.agent);
  if (tool) await page.waitForFunction((t) => window.agent!.list().then((ts) => ts.some((x) => x.name === t)), tool);
}

/** The tool's text answer. */
export function run(page: Page, name: string, args: Record<string, unknown> = {}): Promise<string | undefined> {
  return page.evaluate(
    async ([n, a]) => {
      const result = await window.agent!.run(n, a);
      return result?.content.map((c) => ("text" in c ? c.text : "")).join("\n");
    },
    [name, args] as const,
  );
}

/** A still: `capture/out/stills/<name>.png`, or `<name>.mobile.png` in the mobile project. */
export async function still(page: Page, info: TestInfo, name: string, options: { fullPage?: boolean } = {}): Promise<void> {
  const dir = join(OUT, "stills");
  mkdirSync(dir, { recursive: true });
  const suffix = info.project.name === "mobile" ? ".mobile" : "";
  await page.screenshot({ path: join(dir, `${name}${suffix}.png`), fullPage: options.fullPage ?? false, animations: "disabled" });
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Open the chat panel (bottom corner launcher). */
export async function openChat(page: Page): Promise<void> {
  await page.locator(".wa-chat__launcher").click();
  await page.locator(".wa-chat__panel[data-state=open]").waitFor();
}
