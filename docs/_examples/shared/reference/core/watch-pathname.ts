import { watchPathname } from "@webmcp-agents/core";

// Fires for pushState, replaceState, back, forward and hash changes.
const stop = watchPathname(() => {
  console.log("now at", location.pathname + location.search);
});

// Later: stop();
export { stop };
