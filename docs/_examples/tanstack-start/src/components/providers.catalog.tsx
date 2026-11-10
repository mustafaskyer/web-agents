import { WebAgentsProvider } from "@webmcp-agents/react";
import type { ReactNode } from "react";

import { tools } from "@/tools";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WebAgentsProvider tools={tools}>{children}</WebAgentsProvider>
  );
}
