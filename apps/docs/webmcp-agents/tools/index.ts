/**
 * The site's own WebMCP tools: what a visitor does here, as tools any agent can call (Chrome's WebMCP, the devtools,
 * the chips in <TryIt>). None imports the cursor, and nothing on the page is marked for it: each tool finds the
 * control it acts on by its name, as a person would (the header's Demos, Quickstart and GitHub links and its search,
 * a step's copy button, an FAQ question, an "Open an issue" link), or is handed the element (a demo's frame, the row of tools).
 *
 * Where every tool lives and when it is on (each page registers its catalog through <AgentLayer>; all are on while
 * the page is):
 *
 * | Tool                   | File                     | What it does                                           | Home | Demos |
 * |------------------------|--------------------------|--------------------------------------------------------|------|-------|
 * | show_demo              | show-demo.ts             | replays a clip (Demos) or opens /demos#<demo>          | yes  | yes   |
 * | show_tools             | show-tools.ts            | outlines the row of tools, lists them; the intro       | yes  |       |
 * | search_docs            | search-docs.ts           | types a query into the header's docs search            | yes  | yes   |
 * | open_docs              | open-docs.ts             | answers, then opens a docs page by name (header)       | yes  | yes   |
 * | open_faq               | open-faq.ts              | opens an FAQ question and answers it                   | yes  |       |
 * | copy_step_code         | copy-step-code.ts        | presses a step's copy button, answers the code         | yes  |       |
 * | copy_install_command   | copy-install-command.ts  | presses the install command's copy button              | yes  | yes   |
 * | toggle_theme           | toggle-theme.ts          | `setTheme` from @webmcp-agents/tools: the theme button | yes  | yes   |
 * | open_github            | open-github.ts           | parks on the GitHub link until the person clicks (header) | yes | yes  |
 *
 * (header): not in a catalog. The header's links fold into a menu when the bar is narrow or compacted on scroll, so
 * these tools have two definitions each, the bar's link or the menu's item, and the header's state picks one
 * (../hooks/use-header-tools.ts, registered by <AgentLayer> on both pages).
 * | open_github_issue      | open-github-issue.ts     | parks on "Open an issue", opens a prefilled new issue  | yes  | yes   |
 *
 * The calls the page makes itself are in ../hooks: the first-visit intro (`show_tools`, use-intro.ts) and the hero's
 * chips (use-try-it.ts).
 */
import { copyInstallCommand } from "./copy-install-command";
import { copyStepCode } from "./copy-step-code";
import { openFaq } from "./open-faq";
import { openGithubIssue } from "./open-github-issue";
import { searchDocs } from "./search-docs";
import { showDemo } from "./show-demo";
import { showTools } from "./show-tools";
import { toggleTheme } from "./toggle-theme";

/** The home page's tools (pages/index.astro). */
export const homeTools = {
  showDemo,
  showTools,
  searchDocs,
  openFaq,
  copyStep: copyStepCode,
  copyInstall: copyInstallCommand,
  toggleTheme,
  openGithubIssue,
};

/** The Demos page's tools (pages/demos.astro): the demos themselves, plus what the header and footer offer everywhere. */
export const demosTools = {
  showDemo,
  searchDocs,
  copyInstall: copyInstallCommand,
  toggleTheme,
  openGithubIssue,
};

export { openDocs, openDocsFromMenu } from "./open-docs";
export { openGithub, openGithubFromMenu } from "./open-github";
