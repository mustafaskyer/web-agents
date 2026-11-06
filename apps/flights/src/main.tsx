import "@web-agents/core/cursor.css";
import "./styles/tokens.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "./styles/base.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

// 1. (dev only) give browsers without native WebMCP a document.modelContext, before any tool registers.
//    Phase 7: ship it in the deployed demo behind VITE_WEBMCP_POLYFILL, or most visitors see no tools.
if (import.meta.env.DEV) await import("@web-agents/polyfill/auto");

// 2. the app: <WebAgentsProvider> in Root installs the agent cursor before its first tool registers.
const { routes } = await import("./routes");
const router = createBrowserRouter(routes);

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
