import { setTheme } from "@webmcp-agents/tools";
import { applyTheme, currentTheme } from "@/lib/theme";

/** toggle_theme: the common `set_theme`, under the name the page has always used: it presses the theme button in the header. */
export const toggleTheme = setTheme({
  id: "toggle_theme",
  description:
    'Switch the site between its light and dark theme by pressing the theme button in the header; the choice is remembered and carries over to the docs. Answers the theme now on screen. Use when the user asks for dark mode, light mode or to change the colours. Needs nothing first. Pass "theme" to set one, or nothing to flip it.',
  control: { role: "button", name: "Switch between light and dark" },
  get: currentTheme,
  set: (theme) => applyTheme(theme === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme),
});
