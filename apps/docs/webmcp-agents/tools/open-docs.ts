import { defineWebTool, type WebToolConfig } from "@webmcp-agents/core";
import { DOCS, DOCS_PAGES, type DocsPage } from "@/lib/site";
import { inMenu, leaveFor, oneOf } from "./shared";
import { setMenuOpen } from "@/lib/header";

/**
 * open_docs: answer, then leave for one docs page by name. Two definitions of one tool, by the header's state (see
 * open-github.ts): the bar's Quickstart or Docs link, or the menu's once the bar has folded them away.
 */
const config = {
  id: "open_docs",
  title: "Open a docs page",
  description: `Leave this page for one page of the docs (${DOCS}), named by "page". Use when the user wants to get started (quickstart), asks how something works (tools, agent-cursor, define-web-tool, chat, agents, polyfill), wants a framework guide (vite, nextjs, tanstack-start), or the API reference (reference). For a topic not listed, use search_docs first. Needs nothing first. This page's tools end with the navigation; the docs have their own search.`,
  inputSchema: {
    type: "object",
    properties: {
      page: {
        type: "string",
        enum: Object.keys(DOCS_PAGES),
        description: 'The page, e.g. "quickstart" or "agent-cursor". Default "quickstart".',
      },
    },
  },
  readOnly: false,
  repeatable: true,
  execute: ({ page = "quickstart" }) => {
    const name = oneOf("page", page, Object.keys(DOCS_PAGES) as DocsPage[]);
    const { title, path } = DOCS_PAGES[name];
    const href = `${DOCS}${path}`;
    leaveFor(href);
    return `Opening "${title}" at ${href}.`;
  },
} satisfies WebToolConfig<{ page?: DocsPage }, string>;

/** The header link a page opens from: Quickstart for the quickstart, Docs for any other. */
const linkFor = (page: DocsPage | undefined): string => ((page ?? "quickstart") === "quickstart" ? "Quickstart" : "Docs");

/** The bar shows its links: the cursor presses the header's link. */
export const openDocs = defineWebTool<{ page?: DocsPage }, string>({
  ...config,
  target: ({ page } = {}) => ({ role: "link", name: linkFor(page), within: "header" }),
});

/** The bar folded its links into the menu: the cursor presses the menu button, the menu opens, then the page leaves. */
export const openDocsFromMenu = defineWebTool<{ page?: DocsPage }, string>({
  ...config,
  target: ({ page } = {}) => inMenu(linkFor(page))(),
  execute: (input) => {
    setMenuOpen(true);
    return config.execute(input);
  },
});
