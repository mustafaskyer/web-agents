import "@webmcp-agents/core/cursor.css";
import "@webmcp-agents/chat/chat.css";
import "./styles/tokens.css";
import "./styles/base.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { setNavigate } from "./lib/navigate";
import { routes } from "./routes";

// <WebAgentsProvider> in Root loads the WebMCP polyfill where the browser has none (every visitor gets the tools),
// and installs the agent cursor before its first tool registers.
const router = createBrowserRouter(routes);
// the catalog's tools navigate with the router: same-document, so no call is lost to a page load
setNavigate((to) => void router.navigate(to));

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
