/**
 * The layout every page renders in: stores, the WebMCP provider, header,
 * cart drawer and (dev only) the devtools. The provider gets the router's
 * pathname, since React Router's pushState is invisible without the Navigation API.
 */
import { AgentChat, createCloudAdapter } from "@web-agents/chat";
import { createLocalAdapter } from "@web-agents/local-agent";
import { useAgentEvents, WebAgentsProvider } from "@web-agents/react";
import { lazy, Suspense, useMemo } from "react";
import { Outlet, ScrollRestoration, useLocation, useNavigate } from "react-router";
import { CartDrawer } from "./components/CartDrawer";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { CartProvider, useCart } from "./store/cart";
import { UiProvider, useUi } from "./store/ui";
import { catalog, drawerSafeTools, globalTools } from "./tools/catalog";
import type { StoreContext } from "./tools/context";
import { STORE_INSTRUCTIONS } from "./tools/instructions";

// Dev only: the condition guards the import() itself, so the production bundle has no devtools.
const Devtools = import.meta.env.DEV
  ? lazy(() => import("@web-agents/devtools/react").then((m) => ({ default: m.WebAgentsDevtools })))
  : () => null;

const VISUALS = { spotlight: false };
// Once per page. Cloud checks /api/chat on first use; on-device downloads a model only after the person's click.
const ADAPTERS = [createCloudAdapter(), createLocalAdapter({ instructions: STORE_INSTRUCTIONS })];

/** A tool that isn't about the cart closes the drawer first: the agent never works on a page hidden behind it. */
function CloseDrawerForOtherTools() {
  const { cartOpen, closeCart } = useUi();
  useAgentEvents((e) => {
    if (e.type === "start" && cartOpen && !drawerSafeTools.has(e.tool)) closeCart();
  });
  return null;
}

function Shell() {
  const cart = useCart();
  const ui = useUi();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const context = useMemo<StoreContext>(() => ({ cart, ui, navigate: (to) => void navigate(to) }), [cart, ui, navigate]);

  return (
    <WebAgentsProvider tools={catalog} global={globalTools} pathname={pathname} context={context} visuals={VISUALS}>
      <a href="#main" className="skip">
        Skip to content
      </a>
      {/* inert while the drawer is open: the drawer behaves as a modal without entering the top layer,
          where it would hide the agent cursor and block the devtools */}
      <div className="shell" inert={ui.cartOpen}>
        <Header />
        <main id="main">
          <Outlet />
        </main>
        <Footer />
      </div>
      <CartDrawer />
      <CloseDrawerForOtherTools />
      {/* inside the provider: the assistant sees exactly the tools this page has on */}
      <AgentChat adapters={ADAPTERS} title="Assistant" position={import.meta.env.DEV ? "bottom-left" : "bottom-right"} />
      <Suspense>
        <Devtools initialSettings={{ spotlight: VISUALS.spotlight }} />
      </Suspense>
      <ScrollRestoration />
    </WebAgentsProvider>
  );
}

export function Root() {
  return (
    <CartProvider>
      <UiProvider>
        <Shell />
      </UiProvider>
    </CartProvider>
  );
}
