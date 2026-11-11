import { createWebAgents } from "@webmcp-agents/core";
import { installWebAgentsDevtools } from "@webmcp-agents/devtools";

import { tools } from "@/tools";

// A page without <WebAgentsProvider>, which would install the panel
// itself. Start the cursor first: the Settings switches drive it.
createWebAgents({ tools, visuals: { spotlight: true } });

// Development only: guard the call with your framework's dev flag.
export const removeDevtools = installWebAgentsDevtools({
  initialSettings: { spotlight: true }, // match the cursor's options
  initialOpen: true,
});
