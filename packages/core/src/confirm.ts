/**
 * The confirm gate for imperative tools, the counterpart of a declarative form
 * without `toolautosubmit`: a destructive tool's execute waits until the
 * person clicks the tool's element on the page.
 *
 * Only a trusted click counts (keyboard activation of a button is a trusted
 * click too): a script calling `el.click()` must never be able to confirm on
 * the user's behalf. Nothing to click on means no confirmation: the call
 * fails rather than run unconfirmed. The click is swallowed, so the element's own handler
 * doesn't run the action a second time: the tool's execute is the single
 * source of the action. So is the scripted click a press library re-fires
 * when it saw no click arrive (see `REFIRE_MS`).
 */
import { emit } from "./events";
import { abortError } from "./result";
import type { WebTool } from "./web-tool";
import type { FieldValue } from "./write";

/** On a ModelContextTool: the selector a confirmation click must land in. Survives `{ ...tool }`. */
export const CONFIRM = Symbol.for("web-agents.confirm");
/** On a ModelContextTool: the selector of the element the cursor animates to. Survives `{ ...tool }`. */
export const TARGET = Symbol.for("web-agents.target");
/**
 * On a ModelContextTool made from a WebTool: its `Stage`, which the visuals call to validate a call and find its
 * control and fields before anything moves. In the options of the `execute` that follows: the `Staged` call they
 * got back, so the tool continues it instead of starting over. Survives `{ ...tool }`.
 */
export const STAGE = Symbol.for("web-agents.stage");

/** One parameter the cursor types into a field of the page. */
export interface FieldStep {
  /** The parameter's name. */
  name: string;
  /** The field: a native control, or a custom widget the cursor only visits. */
  field: Element;
  /** The value to write. */
  to: FieldValue;
  /** Set by whoever writes it (the cursor, else the tool's own call), so it is written once. */
  done?: boolean;
}

/** One call of a WebTool, validated and located, before it runs. */
export interface Staged {
  /** The validated input. */
  input: unknown;
  /** The control the call acts on: where the cursor clicks or parks. Null: nothing on the page. */
  el: Element | null;
  /** The parameters with a field on the page, in document order. */
  fields: FieldStep[];
  /** The tool waits for the person's click on `el`. */
  confirm: boolean;
  /** What a missing control is described as, in the error. */
  what: string;
  /** Run the tool's `fill` callback, once however often it is called. */
  fill(): Promise<void>;
}

/** Prepares one call of a WebTool. */
export interface Stage {
  /** Validate the arguments (as the agent sent them) and find the control and the fields. Rejects on invalid input. */
  (args: unknown): Promise<Staged>;
  /** Only the control, from arguments that may be missing or invalid: for a run that is animated after the fact. */
  at(args?: unknown): Element | null;
  /** The tool it stages (for a tool registered as a function, the latest definition). */
  tool: WebTool;
  /** Where a call with no particular input would act, for the devtools. */
  inspect(): ToolControls;
}

/** Where a tool acts and types, as the cursor would find it right now (see `inspectTools`). */
export interface ToolControls {
  /**
   * How the control is found: its `target`, a `toolname` marker, its name (`title`, or the id as words), or `call`:
   * a function `target`, so it depends on each call's input and nothing is resolved here.
   */
  by: "target" | "marker" | "name" | "call";
  /** The controls found that way, in document order. One is what a confirm-gated tool needs; none, the tool runs unseen. */
  controls: Element[];
  /** Each parameter of the input schema and the field its value would be typed into (null: not typed). */
  fields: { name: string; field: Element | null }[];
}

/** The stage of every tool registered with `registerWebTool`, by id: a tool registered before the visuals installed has one too. */
export const stages = new Map<string, Stage>();

/** What the page shows (and the `park` event carries) while a tool waits for the user. */
export const confirmPrompt = (el: Element | null, fallback: string): string => `Click "${el?.textContent?.trim() || fallback}" to confirm`;

/** The user can't confirm: nothing to click on. The agent gets the message as an error result. */
export class ConfirmationUnavailableError extends Error {
  override name = "ConfirmationUnavailableError";
}

/**
 * How long after a confirming click a scripted click on the same element is swallowed too. Press libraries
 * (React Aria's `usePress`) notice that the click never reached their element and call `el.click()` themselves
 * about 80 ms after the pointerup; with the gate gone, that click would run the element's own action after all
 * (a link navigates, `onPress` fires). 300 ms covers it with room for a busy main thread.
 */
const REFIRE_MS = 300;

/** Keep a click from the page: no default action, no handlers. Window capture runs before React's root listeners. */
const swallow = (e: Event): void => {
  e.preventDefault();
  e.stopImmediatePropagation();
};

/** True when a person can click it: on the page and not disabled. */
const clickable = (el: Element | null): el is Element => !!el?.isConnected && !el.matches(":disabled");

/**
 * Resolve when the user clicks one of the elements `target` finds (a selector, or a resolver returning the
 * elements a click may land in, the one to park on first); reject with an AbortError when `signal` aborts. Fails
 * closed: with nothing clickable on the page (missing, or disabled), or once it goes away while waiting, reject
 * with a ConfirmationUnavailableError rather than run unconfirmed or hang. A resolver may throw its own
 * ConfirmationUnavailableError (several controls match, say): that is the rejection. `what` names the missing
 * element in the error.
 */
export function waitForConfirmation(
  target: string | (() => readonly Element[]),
  signal: AbortSignal,
  toolId: string,
  what = String(target),
): Promise<void> {
  if (signal.aborted) return Promise.reject(abortError(signal));
  let failure: unknown;
  const find = (): readonly Element[] => {
    try {
      failure = undefined;
      return typeof target === "string" ? [...document.querySelectorAll(target)] : target();
    } catch (err) {
      failure = err;
      return [];
    }
  };
  const el = find()[0] ?? null;
  const unavailable = (): unknown =>
    failure ??
    new ConfirmationUnavailableError(
      `"${toolId}" needs the user's confirmation, but there is nothing to confirm on (${what}) on the page right now.`,
    );
  if (!clickable(el)) return Promise.reject(unavailable());
  return new Promise<void>((resolve, reject) => {
    const settled = new AbortController();
    const observer = new MutationObserver(() => {
      if (clickable(find()[0] ?? null)) return;
      done();
      reject(unavailable());
    });
    const done = (): void => {
      observer.disconnect();
      settled.abort();
    };
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["disabled"] });
    window.addEventListener(
      "click",
      (e) => {
        const at = e.target;
        const hit = e.isTrusted && at instanceof Element && find().find((el) => el.contains(at));
        if (!hit) return;
        swallow(e); // the app's onClick never sees this click
        done();
        resolve();
        // The re-fired click targets the library's own element: the tool's element, or one around or inside it.
        window.addEventListener(
          "click",
          (again) => {
            const at = again.target;
            if (!again.isTrusted && at instanceof Node && (hit.contains(at) || at.contains(hit))) swallow(again);
          },
          { capture: true, signal: AbortSignal.timeout(REFIRE_MS) },
        );
      },
      { capture: true, signal: settled.signal },
    );
    signal.addEventListener(
      "abort",
      () => {
        done();
        reject(abortError(signal));
      },
      { once: true, signal: settled.signal },
    );
    emit({ type: "park", tool: toolId, prompt: confirmPrompt(el, toolId) });
  });
}
