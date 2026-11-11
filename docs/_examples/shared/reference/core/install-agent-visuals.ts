import { installAgentVisuals, onAgentEvent } from "@webmcp-agents/core";

// Before the first tool registers (before your app renders).
const visuals = installAgentVisuals({
  name: "Assistant",
  linger: 1500,
  spotlight: { blur: 4, dim: 0.08, padding: 12 },
  yieldToUser: { resumeAfter: 800 },
});

// The same events `log` would get, for your own use.
const stop = onAgentEvent((event) => console.debug(event));

// Later, for example from a settings switch.
visuals.setSpotlight(false);
visuals.setYieldToUser(true);

// When the page is done with it (the last handle removes the layer).
stop();
visuals.destroy();
