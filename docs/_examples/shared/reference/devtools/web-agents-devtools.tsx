import { WebAgentsDevtools } from "@webmcp-agents/devtools/react";
import { WebAgentsProvider } from "@webmcp-agents/react";
import type { ReactNode } from "react";

import { tools } from "@/tools";

// The provider's own panel is off: this one is placed by hand, in
// production too. Its Settings switches drive the provider's cursor.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <WebAgentsProvider tools={tools} devtools={false}>
      {children}
      <WebAgentsDevtools initialOpen hotkey="Alt+Shift+D" />
    </WebAgentsProvider>
  );
}
