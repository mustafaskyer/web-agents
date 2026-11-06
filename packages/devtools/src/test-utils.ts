/** Helpers for the browser-mode tests. Not exported from the package. */
import { installWebMCPPolyfill } from "@web-agents/polyfill";

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

/** Resolve once `check` is true, polling every frame; reject after `timeout` ms. */
export async function until(check: () => boolean, timeout = 3000, label = "condition"): Promise<void> {
  const started = performance.now();
  while (!check()) {
    if (performance.now() - started > timeout) throw new Error(`Timed out after ${timeout} ms waiting for ${label}`);
    await new Promise((r) => requestAnimationFrame(r));
  }
}

/** A declarative tool form (`qty` number field) whose submit answers the agent with `answer`. */
export function toolForm(
  name: string,
  { autosubmit = true, answer = "ok" as string | ((form: HTMLFormElement) => string) } = {},
): HTMLFormElement {
  const root = fixture(`
    <form toolname="${name}" tooldescription="Add mugs to the cart" ${autosubmit ? "toolautosubmit" : ""}>
      <label>qty <input name="qty" type="number" min="1" value="1"></label>
      <button type="submit">Add to cart</button>
    </form>`);
  const form = root.querySelector("form") as HTMLFormElement;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const ev = e as SubmitEvent;
    if (ev.agentInvoked) ev.respondWith?.(Promise.resolve(typeof answer === "function" ? answer(form) : answer));
  });
  return form;
}

/** The devtools' shadow root (the floating host). */
export const devtoolsRoot = (): ShadowRoot => {
  const root = document.querySelector('[data-web-agents-ui="devtools"]')?.shadowRoot;
  if (!root) throw new Error("devtools are not mounted");
  return root;
};

/** The first element under `root` matching `selector` whose text includes `text`. */
export function byText<T extends Element = HTMLElement>(root: ParentNode, selector: string, text: string): T | null {
  return ([...root.querySelectorAll<T>(selector)].find((el) => el.textContent?.includes(text)) as T | undefined) ?? null;
}

/** Text of the whole document, including open shadow roots. */
export function deepText(node: Node = document.body): string {
  let text = "";
  const walk = (n: Node): void => {
    if (n.nodeType === Node.TEXT_NODE) text += n.textContent;
    if (n instanceof Element && n.shadowRoot) walk(n.shadowRoot);
    for (const child of n.childNodes) walk(child);
  };
  walk(node);
  return text;
}
