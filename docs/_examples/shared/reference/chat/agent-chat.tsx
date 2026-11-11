import { AgentChat } from "@webmcp-agents/chat";
import { WebAgentsProvider } from "@webmcp-agents/react";
import type { ReactNode } from "react";

import { shopper } from "@/agents";
import { tools } from "@/tools";

// Inside the provider, so the assistant sees the tools this page
// has on. Import chat.css once in your entry file.
export function Page({ children }: { children: ReactNode }) {
  return (
    <WebAgentsProvider tools={tools}>
      {children}
      <AgentChat
        agent={shopper}
        title="Shop assistant"
        position="bottom-left"
        layout="floating"
        suggestions={["What is in my cart?"]}
      />
    </WebAgentsProvider>
  );
}
