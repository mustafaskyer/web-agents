import { goTo } from "@webmcp-agents/tools";

export const tools = {
  // The agent can open only these. It picks a name; the tool
  // clicks the page's own link to the path, or loads it.
  goTo: goTo({
    pages: { home: "/", cart: "/cart", orders: "/orders" },
  }),
};

export async function openCart(): Promise<string> {
  return tools.goTo.invoke({ page: "cart" }); // "Opened cart (/cart)."
}
