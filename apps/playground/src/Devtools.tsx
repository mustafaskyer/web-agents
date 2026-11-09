/**
 * Dev-only devtools, loaded lazily by App. `?tanstack` shows them as a tab in
 * TanStack Devtools instead of the floating panel.
 */
import { TanStackDevtools } from "@tanstack/react-devtools";
import { WebAgentsDevtools, webAgentsDevtoolsPlugin } from "@webmcp-agents/devtools/react";

const TANSTACK = new URLSearchParams(location.search).has("tanstack");

/** `spotlight`: what the provider's cursor was installed with, so the Settings switch starts in sync. */
export default function Devtools({ spotlight }: { spotlight: boolean }) {
  if (TANSTACK) return <TanStackDevtools plugins={[webAgentsDevtoolsPlugin({ initialSettings: { spotlight } })]} />;
  return <WebAgentsDevtools initialSettings={{ spotlight }} />;
}
