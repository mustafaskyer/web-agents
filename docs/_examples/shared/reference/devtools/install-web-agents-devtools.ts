import { installAgentVisuals } from "@webmcp-agents/core";
import { installWebAgentsDevtools } from "@webmcp-agents/devtools";

// The cursor the Settings switches control.
const visuals = installAgentVisuals({ spotlight: true });

// Development only: guard the call with your framework's dev flag.
export const removeDevtools = installWebAgentsDevtools({
  visuals,
  initialSettings: { spotlight: true }, // match what you installed
  initialOpen: true,
});
