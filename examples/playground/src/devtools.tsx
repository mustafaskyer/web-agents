/**
 * `?tanstack` (dev only, loaded lazily by app.tsx): the devtools as a "Web Agents" tab in TanStack Devtools, instead of
 * the floating panel <WebAgentsProvider> installs in development. App passes devtools={false} meanwhile, and the tab
 * drives the provider's cursor all the same.
 */
import { TanStackDevtools } from "@tanstack/react-devtools";
import { webAgentsDevtoolsPlugin } from "@webmcp-agents/devtools/react";

export default function Devtools() {
  return <TanStackDevtools plugins={[webAgentsDevtoolsPlugin()]} />;
}
