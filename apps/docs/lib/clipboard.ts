/**
 * The page's two copy actions: the install command and a step's snippet. A person's button and the agent's tool
 * (`copy_install_command`, `copy_step_code`) run the same function, so both copies look the same: each announces
 * itself with a window event, and the button that shows "Copied" listens for it (hooks/use-copy.ts).
 */
import { STEPS } from "@/components/landing/steps-data";
import { INSTALL_COMMAND } from "./site";

const INSTALL_COPIED = "webmcp:install-copied";
const STEP_COPIED = "webmcp:step-copied";

/** Put the install command on the clipboard and flash its button. False when the browser refuses (no focus, no permission). */
export async function copyInstallCommand(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(INSTALL_COMMAND);
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(INSTALL_COPIED));
  return true;
}

/** Put step `n`'s snippet (1-based) on the clipboard and flash its button. False when the browser refuses. */
export async function copyStepCode(n: number): Promise<boolean> {
  const step = STEPS[n - 1];
  if (!step) return false;
  try {
    await navigator.clipboard.writeText(step.code);
  } catch {
    return false;
  }
  window.dispatchEvent(new CustomEvent(STEP_COPIED, { detail: n }));
  return true;
}

/** Call `listener` after each copy of the install command, whoever made it. Returns the unsubscribe. */
export function onInstallCopied(listener: () => void): () => void {
  window.addEventListener(INSTALL_COPIED, listener);
  return () => window.removeEventListener(INSTALL_COPIED, listener);
}

/** Call `listener` with the step's number after each copy of a step's snippet. Returns the unsubscribe. */
export function onStepCopied(listener: (step: number) => void): () => void {
  const handle = (e: Event): void => listener((e as CustomEvent<number>).detail);
  window.addEventListener(STEP_COPIED, handle);
  return () => window.removeEventListener(STEP_COPIED, handle);
}
