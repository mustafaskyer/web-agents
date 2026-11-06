/**
 * The layout every page renders in: stores, the WebMCP provider, header,
 * cart drawer and (dev only) the devtools. The provider gets the router's
 * pathname, since React Router's pushState is invisible without the Navigation API.
 */
import { WebAgentsProvider } from "@web-agents/react";
import { lazy, Suspense, useMemo } from "react";
import { Outlet, ScrollRestoration, useLocation, useNavigate } from "react-router";
import { CartDrawer } from "./components/CartDrawer";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { CartProvider, useCart } from "./store/cart";
import { UiProvider, useUi } from "./store/ui";
import { catalog, globalTools } from "./tools/catalog";
import type { StoreContext } from "./tools/context";

// Dev only: the condition guards the import() itself, so the production bundle has no devtools.
const Devtools = import.meta.env.DEV
  ? lazy(() => import("@web-agents/devtools/react").then((m) => ({ default: m.WebAgentsDevtools })))
  : () => null;

const VISUALS = { spotlight: true };

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
      {/* Phase 5: <AgentChat /> */}
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
