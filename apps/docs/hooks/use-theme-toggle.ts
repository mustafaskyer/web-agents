import { useEffect } from "react";
import { applyTheme, currentTheme, storedTheme } from "@/lib/theme";

/**
 * The theme button: `toggle` flips light and dark and remembers the choice (the docs read the same key). Until the
 * reader chooses, the page follows the system, live.
 */
export function useThemeToggle(): { toggle: () => void } {
  useEffect(() => {
    const system = matchMedia("(prefers-color-scheme: dark)");
    const follow = (): void => {
      if (!storedTheme()) applyTheme(system.matches ? "dark" : "light", { remember: false });
    };
    system.addEventListener("change", follow);
    return () => system.removeEventListener("change", follow);
  }, []);
  return { toggle: () => applyTheme(currentTheme() === "dark" ? "light" : "dark") };
}
