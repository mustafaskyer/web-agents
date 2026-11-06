/**
 * Dev-only polyfill of document.modelContext: enough of the WebMCP surface to
 * exercise the visuals layer in a browser without native support:
 *
 *   registerTool(tool, { signal }) / unregisterTool(name) / getTools() / executeTool(name, args)
 *   events on document.modelContext: toolchange, toolactivated, toolcancel (each with .toolName)
 *   declarative <form toolname …> scanning, including toolautosubmit and the
 *   confirmation pause (mirrored as data-tool-form-active / data-tool-submit-active
 *   since a polyfill can't define CSS pseudo-classes)
 *   SubmitEvent.agentInvoked + respondWith(promise)
 *
 * It installs nothing when the browser already provides document.modelContext.
 *
 *   import { installWebMCPPolyfill } from "@web-agents/polyfill";
 *   installWebMCPPolyfill();            // or: import "@web-agents/polyfill/auto";
 */
import type {
  ModelContext,
  ModelContextExecuteOptions,
  ModelContextTool,
  ModelContextToolInfo,
  ModelContextToolResult,
  ToolEvent,
} from "@web-agents/core";

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const isField = (el: Element): el is Field =>
  el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;

/** Native setter + input event, so React/Vue/Svelte controlled inputs see the change. */
function setFieldValue(el: Field, value: unknown): void {
  if (el instanceof HTMLInputElement && el.type === "checkbox") {
    el.checked = !!value;
  } else {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    if (setter) setter.call(el, String(value));
    else el.value = String(value);
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function normalize(r: unknown): ModelContextToolResult {
  if (r && typeof r === "object" && Array.isArray((r as ModelContextToolResult).content)) return r as ModelContextToolResult;
  if (r == null) return { content: [] };
  return { content: [{ type: "text", text: typeof r === "string" ? r : JSON.stringify(r) }] };
}

export class PolyfillModelContext extends EventTarget implements ModelContext {
  // biome-ignore lint/suspicious/noExplicitAny: a tool may declare any argument type; registration must accept them all
  #tools = new Map<string, ModelContextTool<any>>();
  #running = new Map<string, AbortController>();
  ontoolchange: ((ev: Event) => void) | null = null;
  ontoolactivated: ((ev: ToolEvent) => void) | null = null;
  ontoolcancel: ((ev: ToolEvent) => void) | null = null;

  #emit(type: "toolchange" | "toolactivated" | "toolcancel", toolName?: string): void {
    const ev = new Event(type);
    if (toolName) Object.defineProperty(ev, "toolName", { value: toolName });
    this.dispatchEvent(ev);
    (this[`on${type}`] as ((e: Event) => void) | null)?.(ev);
  }

  // biome-ignore lint/suspicious/noExplicitAny: a tool may declare any argument type; registration must accept them all
  registerTool(tool: ModelContextTool<any>, { signal }: { signal?: AbortSignal } = {}): void {
    if (!tool?.name) throw new TypeError("tool.name is required");
    this.#tools.set(tool.name, tool);
    // Only this registration: the name may belong to a newer one by the time the signal aborts.
    signal?.addEventListener(
      "abort",
      () => {
        if (this.#tools.get(tool.name) === tool) this.unregisterTool(tool.name);
      },
      { once: true },
    );
    this.#emit("toolchange");
  }

  unregisterTool(name: string): void {
    if (this.#tools.delete(name)) this.#emit("toolchange");
  }

  async getTools(): Promise<ModelContextToolInfo[]> {
    return [...this.#tools.values()].map(({ execute: _execute, ...info }) => info);
  }

  async executeTool(
    toolOrName: ModelContextToolInfo | string,
    rawArgs: Record<string, unknown> | string = {},
  ): Promise<ModelContextToolResult> {
    // Accept both the polyfill's (name, object) and Chrome's (tool, JSON string) call shapes.
    const name = typeof toolOrName === "string" ? toolOrName : toolOrName.name;
    const args: Record<string, unknown> = typeof rawArgs === "string" ? JSON.parse(rawArgs || "{}") : rawArgs;
    const tool = this.#tools.get(name);
    if (!tool) throw new Error(`Unknown tool "${name}"`);
    const controller = new AbortController();
    this.#running.set(name, controller);
    this.#emit("toolactivated", name);
    try {
      return normalize(await tool.execute(args, { signal: controller.signal }));
    } catch (err) {
      if (controller.signal.aborted) throw new DOMException("Tool execution cancelled", "AbortError");
      return { content: [{ type: "text", text: String((err as Error)?.message ?? err) }], isError: true };
    } finally {
      this.#running.delete(name);
    }
  }

  /** Non-standard: lets the dev console cancel a running tool. */
  cancelTool(name: string): boolean {
    const c = this.#running.get(name);
    if (!c) return false;
    c.abort();
    this.#emit("toolcancel", name);
    return true;
  }
}

/**
 * Install the polyfill unless the browser already has `document.modelContext`.
 * Returns whichever ModelContext is active. Safe to call more than once.
 * On the server (no `document`) it does nothing and returns undefined.
 */
export function installWebMCPPolyfill(): ModelContext | undefined {
  if (typeof document === "undefined") return undefined;
  if (document.modelContext) return document.modelContext;
  const mc = new PolyfillModelContext();
  Object.defineProperty(document, "modelContext", { value: mc, configurable: true });

  // ---------------- declarative forms ----------------
  const registeredForms = new WeakMap<HTMLFormElement, string>();
  /**
   * Which form currently owns each tool name. When React remounts a form, the new
   * one can register before the old one is removed; the old one must not take the
   * tool down with it.
   */
  const owners = new Map<string, HTMLFormElement>();
  const release = (name: string, form: HTMLFormElement): void => {
    if (owners.get(name) !== form) return;
    owners.delete(name);
    mc.unregisterTool(name);
  };

  const schemaFor = (form: HTMLFormElement): JSONSchema => {
    const properties: Record<string, JSONSchema> = {};
    const required: string[] = [];
    for (const el of form.elements) {
      if (!isField(el) || !el.name || el.type === "submit" || el.type === "button") continue;
      const prop: JSONSchema = {};
      if (el instanceof HTMLInputElement && (el.type === "number" || el.type === "range")) {
        const step = el.step || "1";
        prop.type = /^\d+$/.test(step) ? "integer" : "number";
        if (el.min !== "") prop.minimum = Number(el.min);
        if (el.max !== "") prop.maximum = Number(el.max);
      } else if (el instanceof HTMLInputElement && el.type === "checkbox") {
        prop.type = "boolean";
      } else {
        prop.type = "string";
        if (el instanceof HTMLSelectElement) prop.enum = [...el.options].map((o) => o.value);
      }
      const label = el.labels?.[0]?.textContent?.trim();
      prop.description = el.getAttribute("toolparamdescription") || label || el.getAttribute("aria-description") || el.name;
      properties[el.name] = prop;
      if (el.required) required.push(el.name);
    }
    return { type: "object", properties, required };
  };

  const registerForm = (form: HTMLFormElement): void => {
    const name = form.getAttribute("toolname");
    if (!name || registeredForms.get(form) === name) return;
    const previous = registeredForms.get(form);
    if (previous) release(previous, form);
    registeredForms.set(form, name);
    owners.set(name, form);

    mc.registerTool({
      name,
      description: form.getAttribute("tooldescription") ?? "",
      inputSchema: schemaFor(form),
      async execute(args: Record<string, unknown>, { signal }: ModelContextExecuteOptions) {
        form.setAttribute("data-tool-form-active", "");
        try {
          for (const [key, value] of Object.entries(args)) {
            const el = form.elements.namedItem(key);
            if (el instanceof Element && isField(el)) setFieldValue(el, value);
          }

          const submitter =
            form.querySelector<HTMLElement>('[type="submit"]') ?? form.querySelector<HTMLElement>("button:not([type=button])");

          if (!form.hasAttribute("toolautosubmit") && submitter) {
            // Pause for user review; a real browser shows :tool-submit-active here.
            submitter.setAttribute("data-tool-submit-active", "");
            await new Promise<void>((resolve, reject) => {
              const onClick = (e: Event) => {
                e.preventDefault();
                cleanup();
                resolve();
              };
              const onAbort = () => {
                cleanup();
                reject(new DOMException("cancelled", "AbortError"));
              };
              const cleanup = () => {
                submitter.removeEventListener("click", onClick, true);
                signal.removeEventListener("abort", onAbort);
                submitter.removeAttribute("data-tool-submit-active");
              };
              submitter.addEventListener("click", onClick, true);
              signal.addEventListener("abort", onAbort, { once: true });
            });
          }

          // Agent-invoked submit: the page answers through respondWith(promise).
          let response: Promise<unknown> | undefined;
          const ev = new SubmitEvent("submit", { bubbles: true, cancelable: true, submitter });
          Object.defineProperties(ev, {
            agentInvoked: { value: true },
            respondWith: {
              value: (p: Promise<unknown>) => {
                response = Promise.resolve(p);
              },
              configurable: true,
            },
          });
          form.dispatchEvent(ev);
          return response ? await response : "Form submitted.";
        } finally {
          form.removeAttribute("data-tool-form-active");
        }
      },
    });
  };

  const unregisterForm = (form: HTMLFormElement): void => {
    const name = registeredForms.get(form);
    if (name) {
      release(name, form);
      registeredForms.delete(form);
    }
  };

  const scan = (): void => document.querySelectorAll<HTMLFormElement>("form[toolname]").forEach(registerForm);

  new MutationObserver((records) => {
    for (const r of records) {
      r.removedNodes.forEach((n) => {
        if (!(n instanceof Element)) return;
        if (n instanceof HTMLFormElement && n.matches("form[toolname]")) unregisterForm(n);
        n.querySelectorAll<HTMLFormElement>("form[toolname]").forEach(unregisterForm);
      });
      if (r.type === "attributes" && r.target instanceof HTMLFormElement) {
        if (r.target.hasAttribute("toolname")) registerForm(r.target);
        else unregisterForm(r.target);
      }
    }
    scan();
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["toolname"] });

  scan();
  console.info("[webmcp-polyfill] document.modelContext installed (dev only)");
  return mc;
}
