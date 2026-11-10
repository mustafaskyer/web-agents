import { WebAgentsProvider } from "@webmcp-agents/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import "@webmcp-agents/core/cursor.css";
import { tools } from "@/tools";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WebAgentsProvider tools={tools}>
      <App />
    </WebAgentsProvider>
  </StrictMode>,
);
