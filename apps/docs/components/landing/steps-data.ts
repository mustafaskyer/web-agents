/**
 * The three things a developer does to get an agent on their page, each with the lines that matter: define a tool
 * with defineWebTool and mark the element it acts on, add the provider, add the chat with an agent. The snippets
 * follow docs/getting-started/quickstart.mdx, docs/reference/core/define-web-tool.md and docs/guides/agents.mdx; keep
 * them in step. Plain data: the page (pages/index.astro) highlights `code` at build time, <Steps> lays it out, and
 * `copy_step_code` copies it.
 */
export interface StepData {
  title: string;
  text: string;
  /** The snippet, as TSX source. */
  code: string;
}

export const STEPS: readonly StepData[] = [
  {
    title: "Define a tool",
    text: "One definition: an id, a description the agent reads, an input schema and execute. Put toolname on the element it acts on and the cursor clicks it there; requireConfirmation waits for the person's own click.",
    code: `// tools.ts
import { defineWebTool } from "@webmcp-agents/react";
import { z } from "zod";

export const addToCart = defineWebTool({
  id: "add_to_cart",
  description: "Add the open product to the cart. Use after open_product.",
  inputSchema: z.object({ qty: z.number().int().min(1).describe("How many, e.g. 2") }),
  execute: ({ qty }, ctx) => ctx.context!.cart.add(qty),
});

// Product.tsx: the element the cursor flies to
<button toolname="add_to_cart">Add to cart</button>`,
  },
  {
    title: "Add the provider",
    text: "It registers each tool when it should be on (everywhere, or on a route) and installs the cursor before the first one. The devtools run any tool by hand, in development only.",
    code: `// App.tsx
import { WebAgentsProvider } from "@webmcp-agents/react";
import "@webmcp-agents/core/cursor.css";
import { addToCart, getCart } from "./tools";

<WebAgentsProvider
  tools={[addToCart, getCart]}
  global={["get_cart"]}
  routes={{ "/product/:slug": ["add_to_cart"] }}
>
  <App />
  {import.meta.env.DEV && <WebAgentsDevtools />}
</WebAgentsProvider>`,
  },
  {
    title: "Add a chat and an agent",
    text: "defineWebAgent is one definition for the browser and the server: instructions, which tools it may use, helpers. The key stays in the handler; the page sends only the agent's id.",
    code: `// agents.ts (shared)
export const shopper = defineWebAgent({
  id: "shopper",
  instructions: "Open a product before adding it to the cart.",
  tools: ["open_product", "add_to_cart", "get_cart"],
});

// in the page
<AgentChat adapters={[createCloudAdapter()]} agent={shopper} />

// on the server, with WEB_AGENTS_MODEL=anthropic/claude-opus-5-5
export default createChatHandler({ agents: [shopper] });`,
  },
];
