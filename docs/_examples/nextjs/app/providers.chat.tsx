"use client";

import { AgentChat } from "@webmcp-agents/chat";
import { WebAgentsProvider } from "@webmcp-agents/react";
import type { ReactNode } from "react";

import "@webmcp-agents/chat/chat.css";
import { shopper } from "@/agents";
import { tools } from "@/tools";

const DEV = process.env.NODE_ENV === "development";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WebAgentsProvider tools={tools}>
      {children}
      <AgentChat
        agent={shopper}
        // In development the provider's devtools launcher has
        // the other corner.
        position={DEV ? "bottom-left" : "bottom-right"}
      />
    </WebAgentsProvider>
  );
}
