import { WebAgentsDevtools } from "@webmcp-agents/devtools/react";
import { WebAgentsProvider } from "@webmcp-agents/react";
import type { ReactNode } from "react";

import { tools } from "@/tools";

// Render it once, inside the provider: its Settings switches then
// drive the provider's cursor. Development only in a real app.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <WebAgentsProvider tools={tools}>
      {children}
      <WebAgentsDevtools initialOpen hotkey="Alt+Shift+D" />
    </WebAgentsProvider>
  );
}
