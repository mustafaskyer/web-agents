/**
 * `set_theme`: light, dark or the system's. It presses the site's own theme switch when the page has one (found by
 * name with core's locator, like the cursor finds any control: a switch or button named "Theme", "Dark mode",
 * "Toggle theme"…), so the site's own code runs and remembers the choice; it calls your `set` when there is no
 * switch or the switch can't reach the theme asked for (a two-state switch and "system").
 *
 *   setTheme()                                                    // a page with a theme button
 *   setTheme({ get: () => theme.current, set: (t) => theme.set(t) }) // anything else
 */
import { defineWebTool, locate, type ToolLocator, type WebTool, WebToolError } from "@webmcp-agents/core";
import type { CommonToolOptions } from "./shared";

/** A theme. `system` follows the device's light or dark setting. */
export type Theme = "light" | "dark" | "system";

/** Options for `setTheme`. */
export interface SetThemeOptions extends CommonToolOptions {
  /**
   * The theme in use. Default: read from `<html>` (`data-theme`, `data-mode`, `data-color-scheme`, a `dark` or `light`
   * class, `color-scheme`), else the system's.
   */
  get?(): Theme | undefined;
  /** Apply a theme yourself: used when the page has no switch, or its switch cannot reach the theme asked for. */
  set?(theme: Theme): void | Promise<void>;
  /**
   * The site's theme switch. Default: a switch, then a button, whose name says theme, dark or light mode
   * (`/theme|dark mode|light mode|color scheme/i`). `false`: never press one, always `set`.
   */
  control?: ToolLocator | false;
}

/** What `set_theme` takes. */
export interface SetThemeInput {
  /** The theme to switch to. Left out: flip between light and dark. */
  theme?: Theme;
}

const DESCRIPTION =
  'Switch the site between its light and dark theme (or follow the system\'s setting) and answer the theme now on screen. Use when the user asks for dark mode, light mode, or to change the colours. Needs nothing first. Pass "theme" to set one, or nothing to flip it.';

const NAMED = /theme|dark mode|light mode|colou?r scheme/i;
const THEMES: readonly Theme[] = ["light", "dark", "system"];
const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme);

/** The theme `<html>` says, or undefined when it says none. */
function pageTheme(): Theme | undefined {
  const root = document.documentElement;
  for (const attr of ["data-theme", "data-mode", "data-color-scheme"]) {
    const value = root.getAttribute(attr);
    if (isTheme(value)) return value;
  }
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  const scheme = (root.style.colorScheme || getComputedStyle(root).colorScheme).trim();
  return scheme === "dark" || scheme === "light" ? scheme : undefined;
}

/** What the device prefers. */
const systemTheme = (): "light" | "dark" => (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

/** The `set_theme` tool: light, dark or system, through the site's switch or your `set`. */
export function setTheme({
  id = "set_theme",
  description = DESCRIPTION,
  get,
  set,
  control,
}: SetThemeOptions = {}): WebTool<SetThemeInput, string> {
  const current = (): Theme => get?.() ?? pageTheme() ?? "system";
  /** What is on screen: `system` resolved to the device's setting. */
  const shown = (theme: Theme): "light" | "dark" => (theme === "system" ? systemTheme() : theme);
  const theSwitch = (): Element | null =>
    control === false
      ? null
      : control
        ? locate(control)
        : (locate({ role: "switch", name: NAMED }) ?? locate({ role: "button", name: NAMED }));

  return defineWebTool<SetThemeInput, string>({
    id,
    title: "Switch the theme",
    description,
    inputSchema: {
      type: "object",
      properties: {
        theme: {
          type: "string",
          enum: [...THEMES],
          description: 'The theme the user asked for, e.g. "dark"; "system" follows the device. Leave out to flip light and dark.',
        },
      },
    },
    // the cursor goes to the switch it presses (none: it runs unseen)
    target: () => theSwitch() ?? undefined,
    execute: async ({ theme } = {}) => {
      if (theme !== undefined && !isTheme(theme))
        throw new WebToolError("invalid_input", `"${theme}" is not a theme: use "light", "dark" or "system".`);
      const want: Theme = theme ?? (shown(current()) === "dark" ? "light" : "dark");
      const reached = (): boolean => (want === "system" ? current() === "system" : shown(current()) === want);
      if (reached()) return `The theme is already ${want}.`;

      // the site's own switch: press it until the theme is the one asked for (a switch may cycle light → dark → system)
      const button = theSwitch();
      if (button) {
        for (let i = 0; i < 3 && !reached(); i++) {
          (button as HTMLElement).click();
          await new Promise((r) => setTimeout(r, 0)); // let the site's handler (and a framework's render) apply it
        }
        if (reached()) return `The theme is now ${want}.`;
      }
      if (set) {
        await set(want);
        return `The theme is now ${want}.`;
      }
      throw new WebToolError(
        "unavailable",
        button
          ? `The theme switch on this page doesn't offer "${want}".`
          : "This page has no theme switch the tool can find, so the theme can't be changed here.",
      );
    },
  });
}
