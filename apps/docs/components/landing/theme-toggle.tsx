"use client";

/**
 * The light/dark switch in the navbar, and the element the `toggle_theme` tool acts on (`toolname`). It writes the same
 * key the docs' own toggle does, so the choice follows the reader across the site. Until they choose, the page follows
 * the system, live.
 */
import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { applyTheme, currentTheme, storedTheme } from "@/lib/theme";

export const ThemeToggle = () => {
  useEffect(() => {
    const system = matchMedia("(prefers-color-scheme: dark)");
    const follow = (): void => {
      if (!storedTheme()) applyTheme(system.matches ? "dark" : "light", { remember: false });
    };
    system.addEventListener("change", follow);
    return () => system.removeEventListener("change", follow);
  }, []);

  return (
    <button
      type="button"
      toolname="toggle_theme"
      aria-label="Switch between light and dark"
      title="Switch between light and dark"
      className={buttonVariants({ variant: "ghost", size: "icon-touch" })}
      onClick={() => applyTheme(currentTheme() === "dark" ? "light" : "dark")}
    >
      {/* both render; the theme on <html> picks one, so the server's markup is right in either theme */}
      <HugeiconsIcon icon={Moon02Icon} aria-hidden="true" className="dark:hidden" />
      <HugeiconsIcon icon={Sun01Icon} aria-hidden="true" className="hidden dark:block" />
    </button>
  );
};
