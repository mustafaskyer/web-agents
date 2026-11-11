import { defineWebTool, locate, WebToolError } from "@webmcp-agents/core";
import { REPO } from "@/lib/site";
import { leaveFor } from "./shared";

/** GitHub's own limit is far higher; a prefilled link this long is still one a browser opens. */
const MAX_BODY = 4000;

/**
 * open_github_issue: draft an issue on the project's GitHub and open it, once the person confirms with their own click
 * on an "Open an issue" link (the FAQ's on the home page, else the footer's). GitHub's new-issue page is prefilled from the arguments; nothing is filed until
 * the person submits it there, signed in as themselves.
 */
export const openGithubIssue = defineWebTool<{ title: string; body?: string }, string>({
  id: "open_github_issue",
  title: "Open an issue",
  description: `Draft a GitHub issue for the project (${REPO}) and open GitHub's new-issue page in a new tab, prefilled with a title and an optional body. Nothing is filed by the call: the cursor parks on an "Open an issue" link until the user clicks it, and they submit the issue on GitHub themselves. Use when the user reports a bug, asks for a feature or wants to give feedback. Needs nothing first. Nothing comes next on this page.`,
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The issue's title in the user's words, short and specific, e.g. Cursor hides behind a sticky header",
      },
      body: {
        type: "string",
        description: "Optional details from the conversation: what happened, what was expected, steps to reproduce (Markdown)",
      },
    },
    required: ["title"],
  },
  readOnly: false,
  external: true,
  requireConfirmation: true,
  // one link to confirm on: the FAQ's (home), else the footer's (every page)
  target: () =>
    locate({ role: "link", name: "Open an issue", within: "#faq" }) ?? { role: "link", name: "Open an issue", within: "footer" },
  execute: ({ title, body }) => {
    const heading = String(title ?? "").trim();
    if (!heading) throw new WebToolError("invalid_input", '"title" is empty. Pass the issue\'s title.');
    const url = new URL(`${REPO}/issues/new`);
    url.searchParams.set("title", heading);
    const details = String(body ?? "").trim();
    if (details) url.searchParams.set("body", details.slice(0, MAX_BODY));
    // Runs right after the person's own click, so the new tab is theirs; a blocked popup falls back to this tab.
    const tab = window.open(url.href, "_blank");
    if (tab) tab.opener = null;
    else leaveFor(url.href);
    return `Opened a new GitHub issue titled "${heading}"${tab ? " in a new tab" : ""}. The user submits it on GitHub.`;
  },
});
