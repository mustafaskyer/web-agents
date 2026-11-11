import {
  resolveModel,
  toToolLoopAgent,
} from "@webmcp-agents/chat/server";
import type { ToolDescriptor } from "@webmcp-agents/chat";

import { shopper } from "@/agents";

// What a page sent with its request: the tools it has right now.
const pageTools: ToolDescriptor[] = [
  {
    name: "get_cart",
    description: "Read the cart: its lines and total.",
    inputSchema: { type: "object", properties: {} },
  },
];

const { model } = await resolveModel(
  "anthropic/claude-opus-5-5",
  process.env,
);

// An AI SDK ToolLoopAgent: the shopper's instructions, its tool
// subset, and one model step (the browser runs the tools).
const loop = toToolLoopAgent(shopper, {
  model,
  tools: pageTools,
  path: "/cart",
});

const result = await loop.generate({ prompt: "What is in my cart?" });
console.log(result.text);
