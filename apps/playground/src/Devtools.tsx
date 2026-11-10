/**
 * Dev-only devtools, loaded lazily by App. `?tanstack` shows them as a tab in
 * TanStack Devtools instead of the floating panel.
 */
import { TanStackDevtools } from "@tanstack/react-devtools";
import { WebAgentsDevtools, webAgentsDevtoolsPlugin } from "@webmcp-agents/devtools/react";

const TANSTACK = new URLSearchParams(location.search).has("tanstack");

export default function Devtools() {
  if (TANSTACK) return <TanStackDevtools plugins={[webAgentsDevtoolsPlugin()]} />;
  return <WebAgentsDevtools />;
}
