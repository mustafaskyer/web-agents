/** Helpers for the browser-mode tests. Not exported from the package. */
import { installWebMCPPolyfill } from "@webmcp-agents/polyfill";

export const modelContext = (): ModelContext => installWebMCPPolyfill() as ModelContext;

let uid = 0;
/** Tool names must be unique per test: the polyfill registry lives as long as the page. */
export const uniqueName = (base: string): string => `${base}_${++uid}`;

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const toolNames = async (): Promise<string[]> => (await modelContext().getTools()).map((t) => t.name);

/** Count `toolchange` events from now on. */
export function countChanges(): { count: () => number; stop: () => void } {
  let n = 0;
  const onChange = (): void => {
    n++;
  };
  modelContext().addEventListener("toolchange", onChange);
  return { count: () => n, stop: () => modelContext().removeEventListener("toolchange", onChange) };
}

export const resultText = (res: unknown): string =>
  typeof res === "string" ? res : ((res as ModelContextToolResult | null)?.content ?? []).map((c) => c.text ?? "").join(" ");

/** Resolve once `check` passes, polling every frame; reject after `timeout` ms. */
export async function until(check: () => boolean | Promise<boolean>, timeout = 3000, label = "condition"): Promise<void> {
  const started = performance.now();
  while (!(await check())) {
    if (performance.now() - started > timeout) throw new Error(`Timed out after ${timeout} ms waiting for ${label}`);
    await new Promise((r) => requestAnimationFrame(r));
  }
}
