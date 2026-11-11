"use client";

/**
 * The install command with a copy button. The button is what the `copy_install_command` tool acts on: its name, "Copy
 * the install command", is the tool's title. The tool and the button share `copyInstallCommand()` (lib/clipboard.ts),
 * so an agent's copy and a person's look the same.
 */
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCopyInstallCommand } from "@/hooks/use-copy";
import { INSTALL_COMMAND } from "@/lib/site";

export const InstallCommand = () => {
  const { copied, copy } = useCopyInstallCommand();

  return (
    <p className="install-command">
      <code>{INSTALL_COMMAND}</code>
      <button type="button" aria-label="Copy the install command" onClick={copy} className="install-command__copy">
        <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} aria-hidden="true" size={14} />
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </button>
    </p>
  );
};
