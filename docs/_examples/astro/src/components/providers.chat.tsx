import { AgentChat } from "@webmcp-agents/chat";
import { WebAgentsProvider } from "@webmcp-agents/react";
import { type ReactNode, useEffect } from "react";

import "@webmcp-agents/chat/chat.css";
import { shopper } from "@/agents";
import { tools } from "@/tools";

const DEV = import.meta.env.DEV;

export function Providers({ children }: { children: ReactNode }) {
  // Development only: the devtools panel.
  useEffect(() => {
    if (!DEV) return;

    void import("@webmcp-agents/devtools").then((devtools) =>
      devtools.installWebAgentsDevtools(),
    );
  }, []);

  return (
    <WebAgentsProvider tools={tools}>
      {children}
      <AgentChat
        agent={shopper}
        // In development, the devtools' launcher has the other corner.
        position={DEV ? "bottom-left" : "bottom-right"}
      />
    </WebAgentsProvider>
  );
}
