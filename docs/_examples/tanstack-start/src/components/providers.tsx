import { WebAgentsProvider } from "@webmcp-agents/react";
import { type ReactNode, useEffect } from "react";

const DEV = import.meta.env.DEV;

export function Providers({ children }: { children: ReactNode }) {
  // Development only: the devtools panel.
  useEffect(() => {
    if (!DEV) return;

    void import("@webmcp-agents/devtools").then((devtools) =>
      devtools.installWebAgentsDevtools(),
    );
  }, []);

  return <WebAgentsProvider>{children}</WebAgentsProvider>;
}
