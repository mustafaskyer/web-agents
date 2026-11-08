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
 *   trusted pointer / wheel / touch / key input (capture on window)      → the user is interacting: yield
 *
 * Install once, before tools register (before your app renders). Every call
 * returns a handle; the layer tears down when the last handle is destroyed.
 */
import { CONFIRM, TARGET, confirmPrompt } from "./confirm";
import { agentCursor, reduced, wait, type SpotlightOptions } from "./cursor";
import { type AgentEvent, emit } from "./events";
import { errorText, isAbortError } from "./result";
import { type YieldOptions, watchUserInput } from "./user-yield";

export type { SpotlightOptions, YieldOptions };

export interface AgentVisualsOptions {
  /** Receives one entry per lifecycle step: the same events `onAgentEvent` delivers. */
  log?: (entry: AgentEvent) => void;
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
  /**
   * Get out of the user's way: when a person moves the mouse, scrolls, touches
   * or types, the cursor hides at once and the running tool finishes without
   * waiting for animations. Default true. Pass options to tune it, false to turn it off.
   */
  yieldToUser?: boolean | YieldOptions;
}

/**
 * Returned by installAgentVisuals, for changing options at runtime and tearing
 * down. If the layer is already installed, later calls share it: only their
 * `spotlight` / `yieldToUser` options are applied.
 */
export interface AgentVisuals {
  setSpotlight(spotlight: boolean | SpotlightOptions): void;
  setYieldToUser(value: boolean | YieldOptions): void;
  /** Release this handle. The last release removes every node, listener and timer. Idempotent. */
  destroy(): void;
}

/** One installed layer, shared by every handle. */
interface Instance {
  refs: number;
  setSpotlight(spotlight: boolean | SpotlightOptions): void;
  setYieldToUser(value: boolean | YieldOptions): void;
  teardown(): void;
}

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
let active: Instance | null = null;

type LifecycleEvent = "toolactivated" | "toolcancel";

/** Chrome ≥156 dispatches on document.modelContext; earlier builds (and some polyfills) on window. */
function onLifecycle(type: LifecycleEvent, listener: (ev: ToolEvent) => void, signal: AbortSignal): void {
  const mc = document.modelContext;
  const target: EventTarget = mc && `on${type}` in mc ? mc : window;
  target.addEventListener(type, listener as EventListener, { signal });
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
  pausedSubmitOf(form) ?? form.querySelector('[type="submit"]') ?? form.querySelector("button:not([type]), button[type=submit]");

const labelOf = (el: Element | null, fallback: string): string => el?.textContent?.trim() || fallback;

const NOOP: AgentVisuals = { setSpotlight() {}, setYieldToUser() {}, destroy() {} };

export function installAgentVisuals(options: AgentVisualsOptions = {}): AgentVisuals {
  if (typeof document === "undefined") return NOOP; // server render: nothing to show
  if (active) {
    if (options.spotlight !== undefined) active.setSpotlight(options.spotlight);
    if (options.yieldToUser !== undefined) active.setYieldToUser(options.yieldToUser);
  } else {
    active = start(options);
  }
  const instance = active;
  instance.refs++;
  let released = false;
  return {
    setSpotlight: (spotlight) => instance.setSpotlight(spotlight),
    setYieldToUser: (value) => instance.setYieldToUser(value),
    destroy() {
      if (released) return;
      released = true;
      if (--instance.refs > 0) return;
      instance.teardown();
      if (active === instance) active = null;
    },
  };
}

function start({
  log = () => {},
  linger = 1200,
  name = "",
  sync = true,
  spotlight = false,
  yieldToUser = true,
}: AgentVisualsOptions): Instance {
  const lifetime = new AbortController();
  const { signal } = lifetime;
  /** False after teardown: in-flight work stops animating and just runs. */
  let alive = true;
  agentCursor.attach();
  agentCursor.setName(name);
  agentCursor.setSpotlight(spotlight);

  const report = (e: AgentEvent): void => {
    log(e);
    emit(e);
  };

  /** A cancelled call is a `cancel`, never an `error`: consumers must not show it as a failure. */
  const reportFailure = (tool: string, err: unknown, startedAt: number): void =>
    report(
      isAbortError(err) ? { type: "cancel", tool } : { type: "error", tool, error: errorText(err), ms: performance.now() - startedAt },
    );

  const runs = new Map<string, Run>();
  /** Imperative tools that name their element with a selector (WebTool `target`) instead of `toolname`. */
  const targets = new Map<string, string | ((args: unknown) => string | undefined)>();
  const byTool = (name: string, args?: unknown): Element | null => {
    const t = targets.get(name);
    return document.querySelector((typeof t === "function" ? t(args) : t) ?? `[toolname="${CSS.escape(name)}"]`);
  };

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
  const snapshots = setInterval(() => {
    if (!document.hidden) snapshotIdle();
  }, 400);

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
    { capture: true, signal },
  );

  // ---------- 1. tool started ----------
  onLifecycle(
    "toolactivated",
    async ({ toolName }) => {
      const el = byTool(toolName);
      // Imperative tools registered through the gate (section 4) are animated from their execute.
      if (gated.has(toolName) && !(el instanceof HTMLFormElement)) return;

      // Already playing: native Chrome announces an autosubmit form after its submit,
      // and some builds (Chrome 150) fire toolactivated twice for a single call.
      const existing = runs.get(toolName);
      if (existing && !existing.closed && performance.now() - existing.startedAt < DUPLICATE_WINDOW_MS) return;

      report({ type: "start", tool: toolName, at: performance.now() });
      if (!el) return; // tool has no on-screen element → nothing to show

      const run = startRun(toolName, el);
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
      const prompt = `Click "${labelOf(btn, "submit")}" to confirm`;
      agentCursor.park(prompt, btn);
      run.parked = true;
      report({ type: "park", tool: toolName, prompt });
    },
    signal,
  );

  // ---------- 2. tool cancelled ----------
  onLifecycle(
    "toolcancel",
    ({ toolName }) => {
      report({ type: "cancel", tool: toolName });
      finish(toolName);
    },
    signal,
  );

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

      // A cancelled or superseded run has already been reported and finished.
      const live = (): boolean => runs.get(toolName) === run;
      const settle = (outcome: Promise<unknown>): Promise<unknown> =>
        outcome.then(
          (result) => {
            if (!live()) return result;
            report({ type: "result", tool: toolName, result, ms: performance.now() - run.startedAt });
            agentCursor.say(`${toolName} done`);
            setTimeout(() => finish(toolName, run.generation), linger);
            return result;
          },
          (err: unknown) => {
            if (!live()) throw err;
            reportFailure(toolName, err, run.startedAt);
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
        let responded = false;
        Object.defineProperty(e, "respondWith", {
          configurable: true,
          value: (p: Promise<unknown>) => {
            responded = true;
            respond(settle(shown.then(() => p)));
          },
        });
        // respondWith must be called while the submit dispatches; if the page never did,
        // nothing will settle this run, so close it once the animation is over.
        void shown.then(() => {
          if (!responded) setTimeout(() => finish(toolName, run.generation), linger);
        });
        return;
      }

      // Sync: hold this submit, answer the agent with a promise, and re-dispatch
      // the submit to the page at the bottom of the cursor's click.
      e.preventDefault();
      e.stopImmediatePropagation();
      let answer!: (value: unknown) => void;
      const response = new Promise<unknown>((resolve) => (answer = resolve));
      const settled = settle(response);
      if (e.respondWith) e.respondWith(settled);
      else void settled.catch(() => {}); // no one to answer, but the run still settles and finishes
      const cancelled = (): void => answer(Promise.reject(new DOMException("Tool execution cancelled", "AbortError")));

      void reach().then(() => {
        // Cancelled (or superseded) while the cursor travelled: the page must never see this submit.
        if (!live()) return cancelled();
        return agentCursor.click(() => {
          if (!live()) return cancelled();
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
          // A plain HTML form nobody handled: do the navigation the browser's own submit would
          // have done. Only for a trusted (native) submit: the polyfill's synthetic one never navigates.
          if (!replay.defaultPrevented && !answered && e.isTrusted) HTMLFormElement.prototype.submit.call(form);
          if (!answered) answer(undefined);
        });
      });
    },
    { capture: true, signal }, // capture: runs before React / app handlers
  );

  // ---------- 4. imperative tools: run execute at the cursor's click ----------
  // A declarative form has a submit to hold; an imperative tool doesn't, the
  // browser just calls execute(). So wrap registerTool once: a tool whose
  // `toolname` element is on screen runs when the cursor presses that element.
  // Tools with no element run immediately; forms pass through (section 3 holds them).
  const gated = new Set<string>();
  const mc = document.modelContext;
  const originalRegister = mc?.registerTool;
  let wrappedRegister: ModelContext["registerTool"] | null = null;
  if (sync && mc && originalRegister) {
    const register = originalRegister.bind(mc);
    wrappedRegister = (tool, options) => {
      gated.add(tool.name);
      const target = (tool as { [TARGET]?: string | ((args: unknown) => string | undefined) })[TARGET];
      if (target) targets.set(tool.name, target);
      else targets.delete(tool.name);
      return register({ ...tool, execute: (args: unknown, ctx?: ModelContextExecuteOptions) => runGated(tool, args, ctx) }, options);
    };
    mc.registerTool = wrappedRegister;
  }

  /** Never block a tool for longer than this, whatever the cursor is doing. */
  const GATE_TIMEOUT_MS = 2500;

  // biome-ignore lint/suspicious/noExplicitAny: a tool may declare any argument type; registration must accept them all
  async function runGated(tool: ModelContextTool<any>, args: unknown, ctx?: ModelContextExecuteOptions): Promise<unknown> {
    if (!alive) return tool.execute(args, ctx as ModelContextExecuteOptions); // torn down: just run it
    const el = byTool(tool.name, args);
    if (el instanceof HTMLFormElement) return tool.execute(args, ctx as ModelContextExecuteOptions);
    if (!el) return runUnseen(tool, args, ctx);

    report({ type: "start", tool: tool.name, at: performance.now(), args });
    agentCursor.say(`${tool.name} started`);
    const run = startRun(tool.name, el);
    if ((tool as { [CONFIRM]?: string })[CONFIRM]) return runConfirmed(tool, args, ctx, el, run);

    let release!: () => void;
    const pressed = new Promise<void>((resolve) => (release = resolve));
    const timeout = setTimeout(() => release(), GATE_TIMEOUT_MS);
    const cancelled = new Promise<never>((_, reject) =>
      ctx?.signal?.addEventListener(
        "abort",
        () => reject(ctx.signal.reason ?? new DOMException("Tool execution cancelled", "AbortError")),
        { once: true },
      ),
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
      report({ type: "result", tool: tool.name, result, ms: performance.now() - run.startedAt });
      agentCursor.say(`${tool.name} done`);
      return result;
    } catch (err) {
      reportFailure(tool.name, err, run.startedAt);
      throw err;
    } finally {
      clearTimeout(timeout);
      setTimeout(() => finish(tool.name, run.generation), linger);
    }
  }

  /** No element to animate: run at once, but still report the run (devtools, chat). */
  // biome-ignore lint/suspicious/noExplicitAny: see runGated
  async function runUnseen(tool: ModelContextTool<any>, args: unknown, ctx?: ModelContextExecuteOptions): Promise<unknown> {
    const startedAt = performance.now();
    report({ type: "start", tool: tool.name, at: startedAt, args });
    try {
      const result = await tool.execute(args, ctx as ModelContextExecuteOptions);
      report({ type: "result", tool: tool.name, result, ms: performance.now() - startedAt });
      return result;
    } catch (err) {
      reportFailure(tool.name, err, startedAt);
      throw err;
    }
  }

  /**
   * A WebTool with `requireConfirmation`: its execute already waits for the
   * user's click, so run it at once (no gate timeout) and park the cursor on
   * the element meanwhile. The cursor clicks only after the user confirmed.
   */
  async function runConfirmed(
    // biome-ignore lint/suspicious/noExplicitAny: see runGated
    tool: ModelContextTool<any>,
    args: unknown,
    ctx: ModelContextExecuteOptions | undefined,
    el: Element,
    run: Run,
  ): Promise<unknown> {
    const current = (): boolean => runs.get(tool.name) === run;
    let settled = false;
    void (async () => {
      await agentCursor.moveTo(el);
      if (settled || !current()) return;
      el.setAttribute("data-agent-active", "");
      const prompt = confirmPrompt(el, tool.name);
      agentCursor.park(prompt, el);
      run.parked = true;
      log({ type: "park", tool: tool.name, prompt }); // the gate itself emits it to onAgentEvent
    })();
    try {
      const result = await tool.execute(args, ctx as ModelContextExecuteOptions);
      settled = true;
      if (current()) {
        if (run.parked) agentCursor.unpark();
        agentCursor.highlight(el);
        void agentCursor.click();
      }
      report({ type: "result", tool: tool.name, result, ms: performance.now() - run.startedAt });
      agentCursor.say(`${tool.name} done`);
      return result;
    } catch (err) {
      settled = true;
      if (run.parked && current()) agentCursor.unpark(); // the shared cursor may be parked for another tool by now
      reportFailure(tool.name, err, run.startedAt);
      throw err;
    } finally {
      run.parked = false;
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
        report({ type: "fill", tool: toolName, field: fill.field.name, value: fill.to });
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
      if (agentCursor.isYielded()) break; // the user took over: no one is watching the typing
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
    // the shared cursor would otherwise stay parked while any other run is still open
    if (run.parked) {
      agentCursor.unpark();
      agentCursor.highlight(null);
    }
    for (const { field } of run.fills) {
      owned.delete(field);
      known.set(field, fieldValue(field));
    }
    if (runs.size === 0) void agentCursor.hide();
  }

  // ---------- 5. yield to the user ----------
  // A person moving the mouse, scrolling, touching or typing wins: the cursor
  // vanishes and every pending step fast-forwards (see GhostCursor.yieldToUser).
  let yielding: AbortController | null = null;
  let resumeTimer = 0;

  function setYieldToUser(value: boolean | YieldOptions): void {
    yielding?.abort();
    yielding = null;
    clearTimeout(resumeTimer);
    agentCursor.resume();
    if (value === false || !alive) return;
    const opts: YieldOptions = value === true ? {} : value;
    const resumeAfter = opts.resumeAfter ?? 800;
    yielding = new AbortController();
    const stop = (): void => yielding?.abort();
    signal.addEventListener("abort", stop, { once: true });
    yielding.signal.addEventListener("abort", () => signal.removeEventListener("abort", stop), { once: true });
    watchUserInput(
      (reason, at) => {
        if (!agentCursor.isYielded()) report({ type: "yield", reason });
        agentCursor.yieldToUser(at);
        clearTimeout(resumeTimer);
        resumeTimer = window.setTimeout(() => {
          agentCursor.resume();
          report({ type: "resume" });
        }, resumeAfter);
      },
      opts,
      yielding.signal,
    );
  }
  setYieldToUser(yieldToUser);

  return {
    refs: 0,
    setSpotlight: (value) => agentCursor.setSpotlight(value),
    setYieldToUser,
    teardown() {
      alive = false;
      lifetime.abort(); // every listener, including the user-input watcher
      clearInterval(snapshots);
      clearTimeout(resumeTimer);
      if (mc && wrappedRegister && mc.registerTool === wrappedRegister && originalRegister) mc.registerTool = originalRegister;
      for (const run of runs.values()) run.el.removeAttribute("data-agent-active");
      runs.clear();
      agentCursor.destroy(); // resolves pending moves; held submits and gated tools then run at once
    },
  };
}
