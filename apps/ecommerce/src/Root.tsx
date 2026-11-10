/**
 * The layout every page renders in: the WebMCP provider, header and cart drawer. The provider follows the URL
 * itself, so it needs nothing from React Router, and installs the devtools panel in development.
 */
import { AgentChat, createCloudAdapter } from "@webmcp-agents/chat";
import { createLocalAdapter, DEFAULT_MODEL } from "@webmcp-agents/local-agent";
import { useAgentEvents, WebAgentsProvider } from "@webmcp-agents/react";
import { Outlet, ScrollRestoration } from "react-router";
import { shopper } from "./agents";
import { CartDrawer } from "./components/CartDrawer";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { ui, useUi } from "./store/ui";
import { DRAWER_SAFE, tools } from "./tools";

// Once per page. Cloud checks /api/chat on first use; on-device downloads a model only after the person's click.
// Both follow the `shopper` agent (src/agents.ts): the cloud reads it from the server registry, the on-device model here.
// two on-device models to pick from: the default, and a larger one for machines with the memory for it
const ADAPTERS = [createCloudAdapter(), createLocalAdapter({ models: [DEFAULT_MODEL, "onnx-community/Qwen3-1.7B-ONNX"] })];

/** A tool that isn't about the cart closes the drawer first: the agent never works on a page hidden behind it. */
function CloseDrawerForOtherTools() {
  useAgentEvents((e) => {
    if (e.type === "start" && ui.cartOpen && !DRAWER_SAFE.has(e.tool)) ui.closeCart();
  });
  return null;
}

export function Root() {
  const { cartOpen } = useUi();
  return (
    <WebAgentsProvider tools={tools}>
      <a href="#main" className="skip">
        Skip to content
      </a>
      {/* inert while the drawer is open: the drawer behaves as a modal without entering the top layer,
          where it would hide the agent cursor and block the devtools */}
      <div className="shell" inert={cartOpen}>
        <Header />
        <main id="main">
          <Outlet />
        </main>
        <Footer />
      </div>
      <CartDrawer />
      <CloseDrawerForOtherTools />
      {/* inside the provider: the assistant sees exactly the tools this page has on */}
      <AgentChat adapters={ADAPTERS} agent={shopper} title="Assistant" position={import.meta.env.DEV ? "bottom-left" : "bottom-right"} />
      <ScrollRestoration />
    </WebAgentsProvider>
  );
}
