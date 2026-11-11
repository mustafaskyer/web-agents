import { defineWebTool } from "@webmcp-agents/core";
import { copyInstallCommand as copy } from "@/lib/clipboard";
import { INSTALL_COMMAND } from "@/lib/site";

/** copy_install_command: press the install command's copy button, and answer the command. */
export const copyInstallCommand = defineWebTool({
  id: "copy_install_command",
  title: "Copy the install command",
  description:
    "Copy the command that installs the packages (core, react, chat) to the user's clipboard, by pressing the copy button next to it. Answers the command itself, so you can also show it. Use when the user wants to install or try WebMCP Agents. Needs nothing first. Next: open_docs quickstart for the steps after installing.",
  readOnly: false,
  repeatable: true,
  execute: async () =>
    (await copy())
      ? `Copied to the clipboard: ${INSTALL_COMMAND}`
      : `The browser did not allow the clipboard (the tab needs focus). The command is: ${INSTALL_COMMAND}`,
});
