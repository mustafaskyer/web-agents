import { UI_HOST_ATTR } from "@webmcp-agents/core";

// A panel of your own that drives the agent. Typing in it never
// makes the cursor yield, and the cursor never aims at its controls.
const host = document.createElement("div");
host.setAttribute(UI_HOST_ATTR, "my-panel");
document.body.append(host);
