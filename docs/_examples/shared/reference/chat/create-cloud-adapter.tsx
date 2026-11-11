import { AgentChat, createCloudAdapter } from "@webmcp-agents/chat";

import { shopper } from "@/agents";

// Once, at module scope: the adapter checks the endpoint on first
// use and keeps its status.
const cloud = createCloudAdapter({
  api: "/api/assistant",
  headers: () => ({ "x-csrf": document.cookie }),
  maxSteps: 6,
  label: "Shop assistant",
});

export function Assistant() {
  return <AgentChat adapter={cloud} agent={shopper} />;
}
