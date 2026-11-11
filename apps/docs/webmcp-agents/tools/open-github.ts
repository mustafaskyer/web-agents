import { defineWebTool, type WebToolConfig } from "@webmcp-agents/core";
import { REPO } from "@/lib/site";
import { inMenu, leaveFor, openMenuAt } from "./shared";

/**
 * open_github: open the source in a new tab, once the person confirms with their own click on the GitHub link. Two
 * definitions of one tool, by the header's state: the bar's GitHub link, or the menu's once the bar has folded it
 * away. The header registers the one that fits (hooks/use-header-tools.ts); their targets are both functions, so the
 * swap keeps the registration (no `toolchange`) and changes only how the next call is carried out.
 */
const config = {
  id: "open_github",
  title: "Open the GitHub repository",
  description: `Open the project's source on GitHub (${REPO}) in a new tab. Leaving the site is the user's call: the cursor parks on the GitHub link and the call waits until they click it themselves. Use when the user asks for the source, the issues or to star the project. Needs nothing first. Nothing comes next on this page.`,
  readOnly: false,
  external: true,
  requireConfirmation: true,
  execute: () => {
    // Runs right after the person's own click, so the new tab is theirs to open; a blocked popup falls back to this
    // tab. ("noopener" in the features would make open() answer null either way.)
    const tab = window.open(REPO, "_blank");
    if (tab) tab.opener = null;
    else leaveFor(REPO);
    return `Opened ${REPO}${tab ? " in a new tab" : ""}.`;
  },
} satisfies WebToolConfig<undefined, string>;

/** The bar shows its links: park on the header's GitHub link. */
export const openGithub = defineWebTool({
  ...config,
  target: () => ({ role: "link", name: "GitHub", within: "header" }),
});

/** The bar folded its links into the menu: the cursor goes to the menu button, the menu opens, it parks on GitHub. */
export const openGithubFromMenu = defineWebTool({
  ...config,
  target: inMenu("GitHub"),
  fill: () => openMenuAt("GitHub"),
});
