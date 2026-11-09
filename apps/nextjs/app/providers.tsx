"use client";
/**
 * The client shell: the cart store, the WebMCP provider (agent cursor + global tools), the header and the chat. A
 * client component because tools need the DOM; the pages themselves stay Server Components.
 */
import { WebAgentsProvider } from "@webmcp-agents/react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { shopper } from "@/agents";
import { createCloudAdapter } from "@webmcp-agents/chat";
import { Header } from "@/components/header";
import { AgentChatBlock } from "@/components/web-agents/agent-chat";
import { CartProvider, useCart } from "@/lib/cart";
import { catalog, globalTools } from "@/tools/catalog";
import type { StoreContext } from "@/tools/context";

// once per page: the cloud adapter checks /api/chat on first use
const ADAPTERS = [createCloudAdapter()];

function Shell({ children }: { children: ReactNode }) {
  const cart = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const context = useMemo<StoreContext>(() => ({ cart, navigate: (to) => router.push(to) }), [cart, router]);
  return (
    <WebAgentsProvider tools={catalog} global={globalTools} pathname={pathname} context={context}>
      <Header />
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
      {/* bottom-left in dev: the devtools launcher has the other corner */}
      <AgentChatBlock
        adapters={ADAPTERS}
        agent={shopper}
        position={process.env.NODE_ENV === "production" ? "bottom-right" : "bottom-left"}
      />
    </WebAgentsProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  // Browsers without native WebMCP get the polyfill (dev and this demo); it must exist before the first tool registers.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const boot = async () => {
      if (!document.modelContext) await import("@webmcp-agents/polyfill/auto");
      if (process.env.NODE_ENV !== "production") {
        // dev only: the devtools panel (Alt+Shift+A) and window.agent for the e2e tests
        const { installWebAgentsDevtools } = await import("@webmcp-agents/devtools");
        installWebAgentsDevtools();
      }
      if (alive) setReady(true);
    };
    void boot();
    return () => {
      alive = false;
    };
  }, []);
  if (!ready) return null;
  return (
    <CartProvider>
      <Shell>{children}</Shell>
    </CartProvider>
  );
}
