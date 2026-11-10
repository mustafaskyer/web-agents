/**
 * The layout every page renders in: the WebMCP provider, header, footer and (dev only) the devtools. The provider
 * follows the URL itself, so the results tools' `match` needs nothing from React Router.
 */
import { AgentChat, createCloudAdapter } from "@webmcp-agents/chat";
import { createLocalAdapter, DEFAULT_MODEL } from "@webmcp-agents/local-agent";
import { WebAgentsProvider } from "@webmcp-agents/react";
import { lazy, Suspense } from "react";
import { Outlet, ScrollRestoration } from "react-router";
import { concierge } from "./agents";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { tools } from "./tools";

// Dev only: the condition guards the import() itself, so the production bundle has no devtools.
const Devtools = import.meta.env.DEV
  ? lazy(() => import("@webmcp-agents/devtools/react").then((m) => ({ default: m.WebAgentsDevtools })))
  : () => null;

// Once per page. Cloud checks /api/chat on first use; on-device downloads a model only after the person's click.
// Both follow the `concierge` agent (src/agents.ts): the cloud reads it from the server registry, the on-device model here.
// two on-device models to pick from: the default, and a larger one for machines with the memory for it
const ADAPTERS = [createCloudAdapter(), createLocalAdapter({ models: [DEFAULT_MODEL, "onnx-community/Qwen3-1.7B-ONNX"] })];

export function Root() {
  return (
    <WebAgentsProvider tools={tools}>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <div className="shell">
        <Header />
        <main id="main">
          <Outlet />
        </main>
        <Footer />
      </div>
      {/* inside the provider: the assistant sees exactly the tools this page has on */}
      <AgentChat adapters={ADAPTERS} agent={concierge} title="Assistant" position={import.meta.env.DEV ? "bottom-left" : "bottom-right"} />
      <Suspense>
        <Devtools />
      </Suspense>
      <ScrollRestoration />
    </WebAgentsProvider>
  );
}
