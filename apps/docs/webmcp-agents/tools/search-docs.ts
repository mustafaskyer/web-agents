import { defineWebTool, WebToolError } from "@webmcp-agents/core";
import { answerFor, searchDocs as search } from "@/lib/docs-search";

/**
 * search_docs: a real search of the docs from the landing page. A tool with an input: the cursor types the query
 * into the search field (named `query`) in the site's header, presses its search button, and the results open in a
 * panel under the field. A person's search runs the same function (hooks/use-docs-search.ts). Reading is harmless: nothing to confirm.
 */
export const searchDocs = defineWebTool<{ query: string }, string>({
  id: "search_docs",
  title: "Search the docs",
  description:
    "Search the WebMCP Agents docs from the landing page by typing key words into the search field in the header. Answers up to five matching pages with their paths and a line from each, and lists them under the field. Use when the user asks how something works or where it is documented. Needs nothing first. Next: open_docs, or tell the user which page to read.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "One or two key words, e.g. confirm or polyfill (not a whole sentence)" },
    },
    required: ["query"],
  },
  readOnly: true,
  execute: async ({ query }) => {
    const words = String(query ?? "").trim();
    if (!words) throw new WebToolError("invalid_input", '"query" is empty. Pass one or two key words.');
    try {
      return answerFor(await search(words));
    } catch {
      throw new WebToolError("failed", "The docs search index did not load. Try again.");
    }
  },
});
