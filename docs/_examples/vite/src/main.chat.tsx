import { AgentChat } from "@webmcp-agents/chat";
import { WebAgentsProvider } from "@webmcp-agents/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import "@webmcp-agents/core/cursor.css";
import "@webmcp-agents/chat/chat.css";
import { shopper } from "@/agents";
import { tools } from "@/tools";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WebAgentsProvider tools={tools}>
      <App />
      <AgentChat
        agent={shopper}
        // In development the provider's devtools launcher has
        // the other corner.
        position={import.meta.env.DEV ? "bottom-left" : "bottom-right"}
      />
    </WebAgentsProvider>
  </StrictMode>,
);
