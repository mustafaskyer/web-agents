"use client";
/**
 * The client shell: the WebMCP provider (agent cursor + the app-wide tools), the header and the chat. A client
 * component because tools need the DOM; it is server-rendered with the page all the same, and the pages themselves
 * stay Server Components. The provider follows the URL itself (no pathname, no router hook), loads the polyfill
 * itself where the browser has no WebMCP (there is no "ready" gate) and the devtools in development.
 */
import { createCloudAdapter } from "@webmcp-agents/chat";
import { WebAgentsProvider } from "@webmcp-agents/react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { shopper } from "@/agents";
import { Header } from "@/components/header";
import { AgentChatBlock } from "@/components/web-agents/agent-chat";
import { setNavigate } from "@/lib/navigate";
import { tools } from "@/tools";

// once per page: the cloud adapter checks /api/chat on first use
const ADAPTERS = [createCloudAdapter()];

export function Providers({ children }: { children: ReactNode }) {
  // the app-wide tools navigate with the App Router: no page load, so no call is lost
  const router = useRouter();
  useEffect(() => setNavigate((to) => router.push(to)), [router]);
  // Server-rendered with the page: the provider loads the WebMCP polyfill in a browser without WebMCP, and the
  // tools register once it is there. In `next dev` it also installs the devtools panel (Alt+Shift+A) and
  // window.agent, which the e2e tests drive.
  return (
    <WebAgentsProvider tools={tools}>
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
