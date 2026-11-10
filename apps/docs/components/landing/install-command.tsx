"use client";

/**
 * The install command with a copy button. The button is what the `copy_install_command` tool acts on: its name, "Copy
 * the install command", is the tool's title. The tool and the button share `copyInstallCommand()`, so an agent's copy
 * and a person's look the same.
 */
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { INSTALL_COMMAND } from "@/lib/site";

const COPIED = "webmcp:install-copied";

/** Put the install command on the clipboard and flash the button. False when the browser refuses (no focus, no permission). */
export async function copyInstallCommand(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(INSTALL_COMMAND);
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(COPIED));
  return true;
}

export const InstallCommand = () => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let timer = 0;
    const flash = (): void => {
      setCopied(true);
      clearTimeout(timer);
      timer = window.setTimeout(() => setCopied(false), 2000);
    };
    window.addEventListener(COPIED, flash);
    return () => {
      window.removeEventListener(COPIED, flash);
      clearTimeout(timer);
    };
  }, []);

  return (
    <p className="install-command">
      <code>{INSTALL_COMMAND}</code>
      <button
        type="button"
        aria-label="Copy the install command"
        onClick={() => void copyInstallCommand()}
        className="install-command__copy"
      >
        <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} aria-hidden="true" size={14} />
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </button>
    </p>
  );
};
