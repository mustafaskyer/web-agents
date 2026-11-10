import { goBack } from "@webmcp-agents/tools";

export const tools = {
  goBack: goBack(),
};

export async function back(): Promise<string> {
  // "Went back to /products?color=blue."
  return tools.goBack.invoke();
}
