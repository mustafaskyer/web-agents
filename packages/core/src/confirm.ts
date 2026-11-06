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
 * source of the action.
 */
import { emit } from "./events";
import { abortError } from "./result";

/** On a ModelContextTool: the selector a confirmation click must land in. Survives `{ ...tool }`. */
export const CONFIRM = Symbol.for("web-agents.confirm");
/** On a ModelContextTool: the selector of the element the cursor animates to. Survives `{ ...tool }`. */
export const TARGET = Symbol.for("web-agents.target");

/** What the page shows (and the `park` event carries) while a tool waits for the user. */
export const confirmPrompt = (el: Element | null, fallback: string): string => `Click "${el?.textContent?.trim() || fallback}" to confirm`;

/** The user can't confirm: nothing to click on. The agent gets the message as an error result. */
export class ConfirmationUnavailableError extends Error {
  override name = "ConfirmationUnavailableError";
}

/** True when a person can click it: on the page and not disabled. */
const clickable = (el: Element | null): el is Element => !!el?.isConnected && !el.matches(":disabled");

/**
 * Resolve when the user clicks an element matching `selector`; reject with an
 * AbortError when `signal` aborts. Fails closed: with nothing clickable on the
 * page (missing, or disabled), or once it goes away while waiting, reject with
 * a ConfirmationUnavailableError rather than run unconfirmed or hang.
 */
export function waitForConfirmation(selector: string, signal: AbortSignal, toolId: string): Promise<void> {
  if (signal.aborted) return Promise.reject(abortError(signal));
  const el = document.querySelector(selector);
  const unavailable = (): ConfirmationUnavailableError =>
    new ConfirmationUnavailableError(
      `"${toolId}" needs the user's confirmation, but there is nothing to confirm on (${selector}) on the page right now.`,
    );
  if (!clickable(el)) return Promise.reject(unavailable());
  return new Promise<void>((resolve, reject) => {
    const settled = new AbortController();
    const observer = new MutationObserver(() => {
      if (clickable(document.querySelector(selector))) return;
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
        if (!e.isTrusted || !(e.target instanceof Element) || !e.target.closest(selector)) return;
        // Window capture runs before React's root listeners: the app's onClick never sees this click.
        e.preventDefault();
        e.stopImmediatePropagation();
        done();
        resolve();
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
