/**
 * The layout every page renders in: the booking store, the WebMCP provider
 * (with the router's pathname: React Router's pushState is invisible without
 * the Navigation API), header, footer and (dev only) the devtools.
 */
import { AgentChat, createCloudAdapter } from "@web-agents/chat";
import { WebAgentsProvider } from "@web-agents/react";
import { lazy, Suspense, useMemo } from "react";
import { Outlet, ScrollRestoration, useLocation, useNavigate } from "react-router";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { BookingProvider, useBooking } from "./store/booking";
import { catalog, globalTools, routeTools } from "./tools/catalog";
import type { FlightsContext } from "./tools/context";

// Dev only: the condition guards the import() itself, so the production bundle has no devtools.
const Devtools = import.meta.env.DEV
  ? lazy(() => import("@web-agents/devtools/react").then((m) => ({ default: m.WebAgentsDevtools })))
  : () => null;

const VISUALS = { spotlight: true };
// Once per page: it checks /api/chat on first use.
const cloud = createCloudAdapter();

function Shell() {
  const booking = useBooking();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const context = useMemo<FlightsContext>(() => ({ booking, navigate: (to) => void navigate(to) }), [booking, navigate]);

  return (
    <WebAgentsProvider tools={catalog} global={globalTools} routes={routeTools} pathname={pathname} context={context} visuals={VISUALS}>
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
      <AgentChat adapter={cloud} title="Assistant" position={import.meta.env.DEV ? "bottom-left" : "bottom-right"} />
      <Suspense>
        <Devtools initialSettings={{ spotlight: VISUALS.spotlight }} />
      </Suspense>
      <ScrollRestoration />
    </WebAgentsProvider>
  );
}

export function Root() {
  return (
    <BookingProvider>
      <Shell />
    </BookingProvider>
  );
}
