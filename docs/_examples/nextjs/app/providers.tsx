"use client";

import { WebAgentsProvider } from "@webmcp-agents/react";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <WebAgentsProvider>{children}</WebAgentsProvider>;
}
