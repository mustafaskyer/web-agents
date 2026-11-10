import { getPage, scrollTo } from "@webmcp-agents/tools";

export const tools = {
  // get_page lists the headings that scroll_to can show
  getPage: getPage(),
  scrollTo: scrollTo({ highlightMs: 4000 }),
};

export async function showShipping(): Promise<string> {
  // Scrolled to the heading "Shipping" and highlighted it. It reads: …
  return tools.scrollTo.invoke({ text: "Shipping" });
}
