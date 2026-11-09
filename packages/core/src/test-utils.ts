/**
 * Helpers for the browser-mode tests. Not exported from the package.
 *
 * The polyfill is imported from source by relative path: core can't depend on
 * @webmcp-agents/polyfill (the polyfill depends on core's types).
 */
import { installWebMCPPolyfill } from "../../polyfill/src/index";
import { type AgentEvent, onAgentEvent } from "./events";

export const modelContext = (): ModelContext => installWebMCPPolyfill() as ModelContext;

let uid = 0;
/** Tool names must be unique per test: the polyfill registry lives as long as the page. */
export const uniqueName = (base: string): string => `${base}_${++uid}`;

/** Mount markup into the page; returns the root element. Removed by `cleanupFixtures()`. */
export function fixture(html: string): HTMLElement {
  const root = document.createElement("div");
  root.className = "test-fixture";
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

export function cleanupFixtures(): void {
  for (const el of document.querySelectorAll(".test-fixture")) el.remove();
}

/** Record every agent event (type only, or full) until `stop()`. */
export function recordEvents(): { events: AgentEvent[]; types: () => string[]; stop: () => void } {
  const events: AgentEvent[] = [];
  const stop = onAgentEvent((e) => events.push(e));
  return { events, types: () => events.map((e) => e.type), stop };
}

/** Resolve once `check` is true, polling every frame; reject after `timeout` ms. */
export async function until(check: () => boolean, timeout = 3000, label = "condition"): Promise<number> {
  const started = performance.now();
  while (!check()) {
    if (performance.now() - started > timeout) throw new Error(`Timed out after ${timeout} ms waiting for ${label}`);
    await new Promise((r) => requestAnimationFrame(r));
  }
  return performance.now() - started;
}

export const cursorVisible = (): boolean => !!document.querySelector(".agent-cursor.is-visible");

/** The text of a tool result from the polyfill. */
export const resultText = (res: unknown): string =>
  typeof res === "string" ? res : ((res as ModelContextToolResult | null)?.content ?? []).map((c) => c.text ?? "").join(" ");

/** A declarative tool form whose submit handler answers the agent with `answer` (and never navigates). */
export function toolForm(
  name: string,
  { fields = '<input name="qty" type="number" min="1">', autosubmit = true, answer = "ok", onSubmit = () => {} } = {},
): HTMLFormElement {
  const root = fixture(`
    <form toolname="${name}" tooldescription="test tool" ${autosubmit ? "toolautosubmit" : ""}>
      ${fields}
      <button type="submit">Go</button>
    </form>`);
  const form = root.querySelector("form") as HTMLFormElement;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    onSubmit();
    const ev = e as SubmitEvent;
    if (ev.agentInvoked) ev.respondWith?.(Promise.resolve(answer));
  });
  return form;
}
