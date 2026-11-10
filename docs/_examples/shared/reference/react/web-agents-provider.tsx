import { WebAgentsProvider } from "@webmcp-agents/react";
import type { ReactNode } from "react";

import { tools } from "@/tools";

// Every tool is in `tools`; which ones an agent may use right now
// follows your own state.
export function Providers({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children: ReactNode;
}) {
  return (
    <WebAgentsProvider
      tools={tools}
      availableTools={
        signedIn
          ? [tools.getTime, tools.getCart, tools.listOrders]
          : [tools.getTime, tools.getCart]
      }
      visuals={{ spotlight: true }}
    >
      {children}
    </WebAgentsProvider>
  );
}
