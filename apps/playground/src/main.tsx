import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@web-agents/core/cursor.css";
import "./app.css";

// 1. (dev only) give browsers without native WebMCP a document.modelContext
if (import.meta.env.DEV) {
  await import("@web-agents/polyfill/auto");
}

// 2. the app: <WebAgentsProvider> (App.tsx) installs the agent cursor before its first tool registers,
//    and (dev only) renders the devtools panel
const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
