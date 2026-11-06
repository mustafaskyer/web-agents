import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { installAgentVisuals } from "@web-agents/core";
import "@web-agents/core/cursor.css";
import "./app.css";

// 1. (dev only) give browsers without native WebMCP a document.modelContext
if (import.meta.env.DEV) {
  await import("@web-agents/polyfill/auto");
}

// 2. the app: <WebAgentsProvider> (App.tsx) installs the agent cursor before its first tool registers
const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// 3. (dev only) a panel that plays the agent
if (import.meta.env.DEV) {
  const { installAgentConsole } = await import("@web-agents/devtools");
  installAgentConsole({
    // Another handle on the provider's layer applies its spotlight and releases at once (installs are ref-counted).
    spotlight: { initial: true, set: (on) => installAgentVisuals({ spotlight: on }).destroy() },
  });
}
