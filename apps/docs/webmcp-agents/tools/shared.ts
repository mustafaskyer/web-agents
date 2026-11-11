/** Helpers the site's tools share. */
import { locate, RESPONSE_GRACE_MS, type ToolLocator, WebToolError } from "@webmcp-agents/core";
import { setMenuOpen } from "@/lib/header";

/** Answer first, leave after: a page that goes away mid-call cancels the call. */
export const leaveFor = (href: string): void => {
  setTimeout(() => location.assign(href), RESPONSE_GRACE_MS);
};

/** `value` if it is one of `allowed`; otherwise an `invalid_input` error that lists them. */
export const oneOf = <T extends string>(name: string, value: unknown, allowed: readonly T[]): T => {
  if (allowed.includes(value as T)) return value as T;
  throw new WebToolError(
    "invalid_input",
    `${name} must be one of ${allowed.map((a) => `"${a}"`).join(", ")}; got ${JSON.stringify(value)}.`,
  );
};

// ---------- the header's menu ----------

/** The button the header folds its links into once the bar is narrow or compacted. */
export const MENU_BUTTON: ToolLocator = { role: "button", name: "Open navigation menu" };

/**
 * A target for a header link once the bar has folded it into the menu: the menu's item when the menu is open, else
 * the menu button (the cursor goes there first).
 */
export const inMenu =
  (name: string): (() => ToolLocator | Element) =>
  () =>
    locate({ role: "menuitem", name }) ?? MENU_BUTTON;

/** Open the header's menu and wait (up to a second) until its item `name` is on screen. */
export async function openMenuAt(name: string): Promise<void> {
  setMenuOpen(true);
  for (let waited = 0; waited < 1000 && !locate({ role: "menuitem", name }); waited += 50) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
