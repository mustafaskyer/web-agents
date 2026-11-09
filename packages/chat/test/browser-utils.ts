/** Browser-test helpers (mirrors the devtools ones). */
import { installWebMCPPolyfill } from "@webmcp-agents/polyfill";

export const modelContext = (): ModelContext => installWebMCPPolyfill() as ModelContext;

let uid = 0;
/** The polyfill registry lives as long as the page: tool names must be unique per test. */
export const uniqueName = (base: string): string => `${base}_${++uid}`;

export function fixture(html: string): HTMLElement {
  const root = document.createElement("div");
  root.className = "test-fixture";
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

export const cleanupFixtures = (): void => {
  for (const el of document.querySelectorAll(".test-fixture")) el.remove();
};

export async function until(check: () => boolean, timeout = 3000, label = "condition"): Promise<void> {
  const started = performance.now();
  while (!check()) {
    if (performance.now() - started > timeout) throw new Error(`Timed out after ${timeout} ms waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 16));
  }
}

/** A declarative form tool whose submit answers `prefix + value`. */
export function echoForm(name: string, { autosubmit = true, prefix = "ok: " } = {}): HTMLFormElement {
  const root = fixture(`
    <form toolname="${name}" tooldescription="Echo a word back. Second sentence." ${autosubmit ? "toolautosubmit" : ""}>
      <input name="word" required>
      <button type="submit">Send it</button>
    </form>`);
  const form = root.querySelector("form")!;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const word = String(new FormData(form).get("word"));
    e.agentInvoked && e.respondWith?.(Promise.resolve(prefix + word));
  });
  return form;
}
