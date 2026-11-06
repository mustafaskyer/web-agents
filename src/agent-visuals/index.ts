/**
 * installAgentVisuals()
 *
 * Makes agent activity visible (a ghost cursor, a focus ring), driven ENTIRELY
 * by WebMCP lifecycle events. It never imports, wraps or patches a tool. The
 * only contract with the page is the `toolname` attribute, which the
 * declarative API already requires and which imperative tools can simply add
 * to the element they act on.
 *
 * In sync mode (the default) the page changes IN STEP with the cursor: the
 * browser fills an agent's fields and submits instantly, so the layer puts the
 * old values back, has the cursor type the new ones when it arrives, and holds
 * the submit until the cursor clicks. The tool's own handler still runs
 * unchanged, just a moment later.
 *
 * Signals it listens to:
 *   input           (capture on document)                                → a tool form field changed
 *   toolactivated   (document.modelContext, Chrome ≥156; window before)  → tool started
 *   toolcancel      (same target)                                        → tool cancelled
 *   submit          (capture phase, only when event.agentInvoked)        → agent submitted a form
 *   :tool-submit-active / [data-tool-submit-active]                      → browser paused for confirmation
 */
import { agentCursor, reduced, wait, type SpotlightOptions } from "./cursor";

export type { SpotlightOptions };
import "./cursor.css";

export type AgentVisualsLogEntry =
  | { type: "start"; tool: string }
  | { type: "cancel"; tool: string }
  | { type: "fill"; tool: string; field: string; value: FieldValue }
  | { type: "result"; tool: string; result: unknown }
  | { type: "error"; tool: string; error: string };

export interface AgentVisualsOptions {
  /** Receives one entry per lifecycle step. */
  log?: (entry: AgentVisualsLogEntry) => void;
  /** How long the cursor stays after a tool finishes, in ms. */
  linger?: number;
  /** Name shown in a tag beside the cursor. Empty (the default) shows no tag. */
  name?: string;
  /**
   * Hold the agent's field values and submit until the cursor reaches them, so
   * the page reacts when the cursor clicks rather than before it arrives.
   * Default true. Set false to animate after the fact without touching the form.
   */
  sync?: boolean;
  /**
   * Blur and dim the page except the tool the cursor is working in.
   * Off by default; pass true, or options to tune blur / dim / padding.
   */
  spotlight?: boolean | SpotlightOptions;
}

/** Returned by installAgentVisuals, for changing options at runtime. */
export interface AgentVisuals {
  setSpotlight(spotlight: boolean | SpotlightOptions): void;
}

const controller: AgentVisuals = {
  setSpotlight: (spotlight) => agentCursor.setSpotlight(spotlight),
};

type FieldValue = string | boolean;
type FieldControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** One field the agent filled. */
interface Fill {
  field: FieldControl;
  from: FieldValue;
  to: FieldValue;
}

interface Run {
  el: Element;
  startedAt: number;
  /** Field input after this moment belongs to the agent's fill. */
  since: number;
  /** `toolactivated` has been seen for this run. */
  activated: boolean;
  fills: Fill[];
  /** The field replay, shared so a submit can wait for one already under way. */
  fieldsDone: Promise<void> | null;
  submitted: boolean;
  /**
   * Can no longer be submitted: the browser announced the tool but neither
   * paused nor submitted (e.g. a fill failed validation). A later submit is a new call.
   */
  closed: boolean;
  /** The browser paused on the submit button and the cursor is parked on it. */
  parked: boolean;
  /** Guards linger timers, so a late one can't end a newer run of the same tool. */
  generation: number;
}

/**
 * Browsers fill a declarative form's fields (firing `input`) a moment BEFORE
 * they announce the tool: native Chrome goes input → submit → toolactivated,
 * the dev polyfill goes toolactivated → input → submit. Any input this close
 * to a run's first signal counts as the agent's.
 */
const FILL_WINDOW_MS = 300;

/** Lifecycle signals for a tool this soon after its run started belong to that run. */
const DUPLICATE_WINDOW_MS = 1000;

let generation = 0;
let installed = false;

const byTool = (name: string): Element | null => document.querySelector(`[toolname="${CSS.escape(name)}"]`);

type LifecycleEvent = "toolactivated" | "toolcancel";

/** Chrome ≥156 dispatches on document.modelContext; earlier builds (and some polyfills) on window. */
function onLifecycle(type: LifecycleEvent, listener: (ev: ToolEvent) => void): void {
  const mc = document.modelContext;
  const target: EventTarget = mc && `on${type}` in mc ? mc : window;
  target.addEventListener(type, listener as EventListener);
}

const isControl = (el: Element): el is FieldControl =>
  el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;

const controlsOf = (form: HTMLFormElement): FieldControl[] =>
  [...form.elements].filter((f): f is FieldControl => isControl(f) && !!f.name && f.type !== "submit" && f.type !== "button");

const isCheckbox = (f: FieldControl): f is HTMLInputElement =>
  f instanceof HTMLInputElement && (f.type === "checkbox" || f.type === "radio");

const fieldValue = (f: FieldControl): FieldValue => (isCheckbox(f) ? f.checked : f.value);

/** The value from the markup, for a field we never saw idle. */
const initialValue = (f: FieldControl): FieldValue => {
  if (isCheckbox(f)) return f.defaultChecked;
  if (f instanceof HTMLSelectElement) return [...f.options].find((o) => o.defaultSelected)?.value ?? f.options[0]?.value ?? "";
  return f.defaultValue;
};

/** Some engines throw on unknown pseudo-classes, so probe them defensively. */
function queryPseudo(root: ParentNode, selector: string): Element | null {
  try {
    return root.querySelector(selector);
  } catch {
    return null;
  }
}

const pausedSubmitOf = (form: HTMLFormElement): Element | null =>
  queryPseudo(form, ":tool-submit-active") ?? form.querySelector("[data-tool-submit-active]");

const submitButtonOf = (form: HTMLFormElement): Element | null =>
  pausedSubmitOf(form) ??
  form.querySelector('[type="submit"]') ??
  form.querySelector("button:not([type]), button[type=submit]");

const labelOf = (el: Element | null, fallback: string): string => el?.textContent?.trim() || fallback;

export function installAgentVisuals({
  log = () => {},
  linger = 1200,
  name = "",
  sync = true,
  spotlight = false,
}: AgentVisualsOptions = {}): AgentVisuals {
  if (installed) return controller;
  installed = true;
  agentCursor.setName(name);
  agentCursor.setSpotlight(spotlight);

  const runs = new Map<string, Run>();

  // ---------- field bookkeeping ----------
  /** Last value seen while no agent was touching the field: what to restore. */
  const known = new WeakMap<FieldControl, FieldValue>();
  const lastInput = new WeakMap<FieldControl, number>();
  /** Fields currently owned by a run; their snapshot is frozen. */
  const owned = new WeakSet<FieldControl>();
  /** Our own replayed submits, so the submit listener lets them through. */
  const replayed = new WeakSet<Event>();
  let writing = false;

  /** Write like a user would: native setter + input/change, so React & co. see it. */
  function writeField(f: FieldControl, value: FieldValue): void {
    writing = true;
    try {
      if (isCheckbox(f)) f.checked = !!value;
      else Object.getOwnPropertyDescriptor(Object.getPrototypeOf(f), "value")?.set?.call(f, String(value));
      f.dispatchEvent(new Event("input", { bubbles: true }));
      f.dispatchEvent(new Event("change", { bubbles: true }));
    } finally {
      writing = false;
    }
  }

  /** Keep a fresh snapshot of every tool field while nothing is touching it. */
  function snapshotIdle(): void {
    const now = performance.now();
    for (const form of document.querySelectorAll<HTMLFormElement>("form[toolname]")) {
      for (const f of controlsOf(form)) {
        if (!owned.has(f) && now - (lastInput.get(f) ?? -Infinity) > FILL_WINDOW_MS) known.set(f, fieldValue(f));
      }
    }
  }
  snapshotIdle();
  setInterval(snapshotIdle, 400);

  /** Take ownership of a field the agent just filled, and (in sync mode) put the old value back. */
  function claim(run: Run, f: FieldControl): void {
    let fill = run.fills.find((x) => x.field === f);
    if (fill) {
      fill.to = fieldValue(f);
    } else {
      fill = { field: f, from: known.get(f) ?? initialValue(f), to: fieldValue(f) };
      run.fills.push(fill);
      owned.add(f);
    }
    if (sync && fill.from !== fill.to) writeField(f, fill.from);
  }

  function claimRecentFills(run: Run): void {
    if (!(run.el instanceof HTMLFormElement)) return;
    for (const f of controlsOf(run.el)) if ((lastInput.get(f) ?? -Infinity) >= run.since) claim(run, f);
  }

  const startRun = (toolName: string, el: Element): Run => {
    const now = performance.now();
    const run: Run = {
      el,
      startedAt: now,
      since: now - FILL_WINDOW_MS,
      activated: false,
      fills: [],
      fieldsDone: null,
      submitted: false,
      closed: false,
      parked: false,
      generation: ++generation,
    };
    runs.set(toolName, run);
    claimRecentFills(run);
    return run;
  };
  const isOpen = (run: Run): boolean => !run.submitted && !run.closed;
  const isCurrent = (toolName: string, run: Run): boolean => runs.get(toolName) === run && isOpen(run);

  // ---------- 0. field changes ----------
  document.addEventListener(
    "input",
    (e) => {
      if (writing || !(e.target instanceof Element) || !isControl(e.target)) return;
      const toolName = e.target.form?.getAttribute("toolname");
      if (!toolName) return;
      lastInput.set(e.target, performance.now());

      // Polyfill order: the run already started and the agent is filling now.
      const run = runs.get(toolName);
      if (run && isOpen(run) && !run.fieldsDone) claim(run, e.target);
    },
    true,
  );

  // ---------- 1. tool started ----------
  onLifecycle("toolactivated", async ({ toolName }) => {
    const el = byTool(toolName);
    // Imperative tools registered through the gate (section 4) are animated from their execute.
    if (gated.has(toolName) && !(el instanceof HTMLFormElement)) return;
    log({ type: "start", tool: toolName });
    if (!el) return; // tool has no on-screen element → nothing to show

    // Already playing: native Chrome announces an autosubmit form after its submit,
    // and some builds (Chrome 150) fire toolactivated twice for a single call.
    const existing = runs.get(toolName);
    if (existing && !existing.closed && performance.now() - existing.startedAt < DUPLICATE_WINDOW_MS) {
      existing.activated = true;
      return;
    }

    const run = startRun(toolName, el);
    run.activated = true;
    const form = el instanceof HTMLFormElement ? el : null;
    agentCursor.say(`${toolName} started`);

    if (!form) {
      // Imperative tool registered before the layer was installed (or sync off):
      // it has already run, so animate after the fact.
      await agentCursor.moveTo(el);
      if (runs.get(toolName) !== run) return;
      el.setAttribute("data-agent-active", "");
      agentCursor.highlight(el);
      await agentCursor.click();
      setTimeout(() => finish(toolName, run.generation), linger);
      return;
    }

    // Declarative form. Give the browser a tick to fill (polyfill order), then
    // head for the first field, or the form itself if nothing was filled.
    await wait(0);
    if (!isCurrent(toolName, run)) return;
    if (run.fills.length === 0) await agentCursor.moveTo(form);
    if (!isCurrent(toolName, run)) return;

    await playFields(run, toolName);
    if (!isCurrent(toolName, run)) return;
    const btn = pausedSubmitOf(form);
    if (!btn) {
      // Announced, but the browser neither paused nor submitted: nothing more will happen.
      run.closed = true;
      setTimeout(() => finish(toolName, run.generation), linger);
      return;
    }

    // The browser is pausing for the user: park on the button.
    await agentCursor.moveTo(btn);
    if (!isCurrent(toolName, run)) return;
    agentCursor.highlight(btn);
    agentCursor.park(`Click "${labelOf(btn, "submit")}" to confirm`);
    run.parked = true;
  });

  // ---------- 2. tool cancelled ----------
  onLifecycle("toolcancel", ({ toolName }) => {
    log({ type: "cancel", tool: toolName });
    finish(toolName);
  });

  // ---------- 3. agent submitted a form ----------
  document.addEventListener(
    "submit",
    (e: SubmitEvent) => {
      if (replayed.has(e) || !e.agentInvoked || !(e.target instanceof HTMLFormElement)) return;
      const form = e.target;
      const toolName = form.getAttribute("toolname");
      if (!toolName) return;

      // Reuse the run toolactivated started (polyfill order, or a confirmed pause);
      // otherwise this submit is the first signal (native order) or a new call.
      const existing = runs.get(toolName);
      const run = existing && isOpen(existing) ? existing : startRun(toolName, form);
      const wasParked = run.parked;
      run.submitted = true;
      run.parked = false;
      agentCursor.unpark();

      const reach = async (): Promise<void> => {
        await playFields(run, toolName);
        const btn = submitButtonOf(form);
        if (btn) {
          // After a confirmation pause the cursor is already resting on the button.
          if (!wasParked) await agentCursor.moveTo(btn);
          agentCursor.highlight(btn);
        }
      };

      const settle = (outcome: Promise<unknown>): Promise<unknown> =>
        outcome.then(
          (result) => {
            log({ type: "result", tool: toolName, result });
            agentCursor.say(`${toolName} done`);
            setTimeout(() => finish(toolName, run.generation), linger);
            return result;
          },
          (err: unknown) => {
            log({ type: "error", tool: toolName, error: String(err) });
            setTimeout(() => finish(toolName, run.generation), linger);
            throw err;
          },
        );

      if (!sync) {
        // Let the page handle the submit now; animate, then release the agent's result.
        const shown = reach().then(() => agentCursor.click());
        const respond = e.respondWith?.bind(e);
        if (!respond) {
          void shown.then(() => settle(Promise.resolve(undefined)));
          return;
        }
        Object.defineProperty(e, "respondWith", {
          configurable: true,
          value: (p: Promise<unknown>) => respond(settle(shown.then(() => p))),
        });
        return;
      }

      // Sync: hold this submit, answer the agent with a promise, and re-dispatch
      // the submit to the page at the bottom of the cursor's click.
      e.preventDefault();
      e.stopImmediatePropagation();
      let answer!: (value: unknown) => void;
      const response = new Promise<unknown>((resolve) => (answer = resolve));
      e.respondWith?.(settle(response));

      void reach().then(() =>
        agentCursor.click(() => {
          const replay = new SubmitEvent("submit", { bubbles: true, cancelable: true, submitter: e.submitter });
          let answered = false;
          Object.defineProperties(replay, {
            agentInvoked: { value: true },
            respondWith: {
              configurable: true,
              value: (p: Promise<unknown>) => {
                answered = true;
                answer(p);
              },
            },
          });
          replayed.add(replay);
          form.dispatchEvent(replay);
          // A plain HTML form with no JS handler: do the navigation it would have done.
          if (!replay.defaultPrevented) HTMLFormElement.prototype.submit.call(form);
          if (!answered) answer(undefined);
        }),
      );
    },
    true, // capture: runs before React / app handlers
  );

  // ---------- 4. imperative tools: run execute at the cursor's click ----------
  // A declarative form has a submit to hold; an imperative tool doesn't, the
  // browser just calls execute(). So wrap registerTool once: a tool whose
  // `toolname` element is on screen runs when the cursor presses that element.
  // Tools with no element run immediately; forms pass through (section 3 holds them).
  const gated = new Set<string>();
  const mc = document.modelContext;
  if (sync && mc) {
    const register = mc.registerTool.bind(mc);
    mc.registerTool = (tool, options) => {
      gated.add(tool.name);
      return register({ ...tool, execute: (args: unknown, ctx?: ModelContextExecuteOptions) => runGated(tool, args, ctx) }, options);
    };
  }

  /** Never block a tool for longer than this, whatever the cursor is doing. */
  const GATE_TIMEOUT_MS = 2500;

  async function runGated(tool: ModelContextTool<any>, args: unknown, ctx?: ModelContextExecuteOptions): Promise<unknown> {
    const el = byTool(tool.name);
    if (!el || el instanceof HTMLFormElement) return tool.execute(args, ctx as ModelContextExecuteOptions);

    log({ type: "start", tool: tool.name });
    agentCursor.say(`${tool.name} started`);
    const run = startRun(tool.name, el);
    run.activated = true;

    let release!: () => void;
    const pressed = new Promise<void>((resolve) => (release = resolve));
    const timeout = setTimeout(() => release(), GATE_TIMEOUT_MS);
    const cancelled = new Promise<never>((_, reject) =>
      ctx?.signal?.addEventListener("abort", () => reject(ctx.signal.reason ?? new DOMException("Tool execution cancelled", "AbortError")), { once: true }),
    );

    void (async () => {
      await agentCursor.moveTo(el);
      if (runs.get(tool.name) !== run) return release(); // superseded: don't hold the tool
      el.setAttribute("data-agent-active", "");
      agentCursor.highlight(el);
      await agentCursor.click(release);
    })();

    try {
      await Promise.race([pressed, cancelled]);
      const result = await tool.execute(args, ctx as ModelContextExecuteOptions);
      log({ type: "result", tool: tool.name, result });
      agentCursor.say(`${tool.name} done`);
      return result;
    } catch (err) {
      log({ type: "error", tool: tool.name, error: String(err) });
      throw err;
    } finally {
      clearTimeout(timeout);
      setTimeout(() => finish(tool.name, run.generation), linger);
    }
  }

  // ---------- helpers ----------
  /** Visit each field the agent filled: glide there, type the value in, flash. */
  function playFields(run: Run, toolName: string): Promise<void> {
    run.fieldsDone ??= (async () => {
      const order = run.el instanceof HTMLFormElement ? controlsOf(run.el) : [];
      const fills = [...run.fills].sort((a, b) => order.indexOf(a.field) - order.indexOf(b.field));
      for (const fill of fills) {
        if (runs.get(toolName) !== run) return;
        await agentCursor.moveTo(fill.field);
        agentCursor.highlight(fill.field);
        agentCursor.say(`${toolName}: ${fill.field.name} = ${JSON.stringify(fill.to)}`);
        if (sync) await typeInto(fill);
        agentCursor.flash();
        log({ type: "fill", tool: toolName, field: fill.field.name, value: fill.to });
        await wait(60);
      }
    })();
    return run.fieldsDone;
  }

  /** Type the agent's value into the field, a character at a time. */
  async function typeInto({ field, from, to }: Fill): Promise<void> {
    if (typeof to !== "string" || isCheckbox(field) || field instanceof HTMLSelectElement || reduced()) {
      writeField(field, to);
      return;
    }
    // Extend the old value if the new one starts with it; otherwise type over it
    // (like select-all + type), never passing through an empty field, which
    // number inputs in React would render as "0".
    let typed = typeof from === "string" && to.startsWith(from) ? from : "";
    const perChar = Math.min(70, Math.max(30, 420 / Math.max(1, to.length - typed.length)));
    while (typed.length < to.length) {
      typed = to.slice(0, typed.length + 1);
      writeField(field, typed);
      await wait(perChar);
    }
    if (field.value !== to) writeField(field, to);
  }

  function finish(toolName: string, onlyGeneration?: number): void {
    const run = runs.get(toolName);
    if (!run || (onlyGeneration !== undefined && run.generation !== onlyGeneration)) return;
    run.el.removeAttribute("data-agent-active");
    runs.delete(toolName);
    for (const { field } of run.fills) {
      owned.delete(field);
      known.set(field, fieldValue(field));
    }
    if (runs.size === 0) void agentCursor.hide();
  }

  return controller;
}
