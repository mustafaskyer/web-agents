import { defineWebTool, WebToolError } from "@webmcp-agents/core";
import { FAQ_TOPICS } from "@/components/landing/faq-data";
import { drawOutline } from "@/lib/outline";
import { DOCS_PAGES } from "@/lib/site";
import { toolsRow } from "@/lib/tools-row";

/** show_tools: outline the row of tools under the title and list every tool on the page. Also the first-visit intro. */
export const showTools = defineWebTool({
  id: "show_tools",
  title: "Show what you can try here",
  description:
    "Point at the row of tools under the title on the home page and outline it. Answers every tool on this page with one line on what it does, so you can tell the user what they can ask for. Use when the user asks what they can do here or what an agent can do on this site. Needs nothing first. Next: any of the tools it lists.",
  readOnly: true,
  repeatable: true,
  // the row itself (it is library-like UI the person drives, so it isn't a control the locator offers)
  target: () => toolsRow(),
  execute: () => {
    const row = toolsRow();
    if (!row) throw new WebToolError("unavailable", "The row of tools is on the home page (/).");
    drawOutline(row, { pad: 10, radius: 22 });
    return [
      "The tools on this page:",
      '- show_demo({ demo: "skyline" | "field-store" }): watch an agent book a flight or check out, on the Demos page',
      '- search_docs({ query }): search the docs, e.g. "confirm"',
      `- open_docs({ page }): open a docs page by name (${Object.keys(DOCS_PAGES).join(", ")})`,
      `- open_faq({ topic }): open an answer in the FAQ (${FAQ_TOPICS.join(", ")})`,
      "- copy_step_code({ step: 1 | 2 | 3 }): copy a step's code from How it works",
      "- copy_install_command(): copy the install command",
      '- toggle_theme({ theme?: "light" | "dark" }): switch the theme',
      "- open_github(): open the source on GitHub (the user clicks to confirm)",
      "- open_github_issue({ title, body? }): draft a GitHub issue for the user to submit (they click to confirm)",
    ].join("\n");
  },
});
