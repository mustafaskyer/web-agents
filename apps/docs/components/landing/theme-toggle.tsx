"use client";

/**
 * The light/dark switch in the navbar, and the button the `toggle_theme` tool presses (by its name). It writes the same
 * key the docs' own toggle does, so the choice follows the reader across the site. Until they choose, the page follows
 * the system, live.
 */
import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { buttonVariants } from "@/components/ui/button";
import { useThemeToggle } from "@/hooks/use-theme-toggle";

export const ThemeToggle = () => {
  const { toggle } = useThemeToggle();

  return (
    <button
      type="button"
      aria-label="Switch between light and dark"
      title="Switch between light and dark"
      className={buttonVariants({ variant: "ghost", size: "icon-touch" })}
      onClick={toggle}
    >
      {/* both render; the theme on <html> picks one, so the server's markup is right in either theme */}
      <HugeiconsIcon icon={Moon02Icon} aria-hidden="true" className="dark:hidden" />
      <HugeiconsIcon icon={Sun01Icon} aria-hidden="true" className="hidden dark:block" />
    </button>
  );
};
