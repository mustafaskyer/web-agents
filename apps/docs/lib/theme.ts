/**
 * The site's colour theme, shared with the docs: Blume keeps the reader's choice in `localStorage["blume-theme"]` and
 * applies it as `data-theme` on <html> before the first paint (its init script is in pages/index.astro's head too).
 */
export type Theme = "light" | "dark";

const KEY = "blume-theme";

/** The theme on screen right now. */
export const currentTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

/** The reader's stored choice, if they made one (on this page or in the docs). */
export function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null; // private mode or blocked storage
  }
}

/** Switch the page to `next`. `remember: false` follows the system without recording a choice. */
export function applyTheme(next: Theme, { remember = true }: { remember?: boolean } = {}): void {
  const root = document.documentElement;
  if (root.dataset.theme !== next) {
    // every colour changes at once: no element should animate its own way there
    const still = document.createElement("style");
    still.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.append(still);
    root.dataset.theme = next;
    void getComputedStyle(root).opacity;
    setTimeout(() => still.remove(), 1);
  }
  if (!remember) return;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // the theme still applies for this visit
  }
}
