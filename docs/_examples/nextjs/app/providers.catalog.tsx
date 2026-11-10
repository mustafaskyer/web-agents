"use client";

import { WebAgentsProvider } from "@webmcp-agents/react";
import { type ReactNode, useEffect } from "react";

import { tools } from "@/tools";

const DEV = process.env.NODE_ENV !== "production";

export function Providers({ children }: { children: ReactNode }) {
  // Development only: the devtools panel.
  useEffect(() => {
    if (!DEV) return;

    void import("@webmcp-agents/devtools").then((devtools) =>
      devtools.installWebAgentsDevtools(),
    );
  }, []);

  return (
    <WebAgentsProvider tools={tools}>{children}</WebAgentsProvider>
  );
}
