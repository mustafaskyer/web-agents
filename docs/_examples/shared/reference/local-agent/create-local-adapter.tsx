import { AgentChat, createCloudAdapter } from "@webmcp-agents/chat";
import { createLocalAdapter } from "@webmcp-agents/local-agent";

// A few short lines: small models cannot infer a site's flow from
// its tool names, so say it.
const instructions = [
  "To find a product: search_products with one key word.",
  "To show one: open_product with its slug.",
  "add_to_cart exists only on a product's page.",
].join("\n");

// Create the adapters once per page, outside any component.
const adapters = [
  createCloudAdapter(),
  createLocalAdapter({
    instructions,
    maxSteps: 4,
    label: "On-device",
  }),
];

export function Chat() {
  return <AgentChat adapters={adapters} title="Assistant" />;
}
