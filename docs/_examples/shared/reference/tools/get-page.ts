import { getPage } from "@webmcp-agents/tools";

export const tools = {
  getPage: getPage({ maxHeadings: 20 }),
};

// On /products?color=blue&size=m&size=l
export async function filters(): Promise<unknown> {
  const { structuredContent } = await tools.getPage.invoke();
  return structuredContent.query; // { color: "blue", size: ["m", "l"] }
}
