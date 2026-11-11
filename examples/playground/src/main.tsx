import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import "./styles/app.css";
import "@webmcp-agents/core/cursor.css";
import "@webmcp-agents/chat/chat.css";

// The app: <WebAgentsProvider> (app.tsx) loads the WebMCP polyfill where the browser has none, installs the agent
// cursor before its first tool registers, and (dev only) renders the devtools panel.
const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
