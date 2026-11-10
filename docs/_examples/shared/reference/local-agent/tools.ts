import type { ToolDescriptor } from "@webmcp-agents/chat";
import {
  compactSchema,
  rankTools,
  validateArgs,
} from "@webmcp-agents/local-agent";

const tools: ToolDescriptor[] = [
  {
    name: "add_to_cart",
    description: "Add a product to the cart. Only on a product page.",
    inputSchema: {
      type: "object",
      properties: { qty: { type: "integer", minimum: 1 } },
      required: ["qty"],
    },
  },
  {
    name: "search_products",
    description: "Search the catalogue by a key word.",
    inputSchema: { type: "object", properties: {} },
  },
];

// At most `max` tools, the ones most like the request first.
const shown = rankTools(tools, "add two mugs to the cart", {
  max: 1,
  recent: ["search_products"],
});
console.log(shown[0]?.name); // "add_to_cart"

// A call's arguments, checked before it touches the page.
const problem = validateArgs(shown[0]!.parameters, { qty: 0 });
console.log(problem); // "qty" must be at least 1.

// Only what a small model needs of a schema.
console.log(compactSchema(tools[0]!.inputSchema));
