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

// 2. the visual layer: event-driven, knows nothing about the tools below
const SPOTLIGHT = true; // blur the page except the tool the agent is working in
const visuals = installAgentVisuals({
  log: (entry) => console.debug("[agent-visuals]", entry),
  spotlight: SPOTLIGHT,
});

// 3. the app, whose tools are plain forms / plain hooks
const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// 4. (dev only) a panel that plays the agent
if (import.meta.env.DEV) {
  const { installAgentConsole } = await import("@web-agents/devtools");
  installAgentConsole({
    spotlight: { initial: SPOTLIGHT, set: (on) => visuals.setSpotlight(on) },
  });
}
