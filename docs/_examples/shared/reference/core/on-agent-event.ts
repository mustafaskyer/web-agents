import { onAgentEvent } from "@webmcp-agents/core";

// A banner that says what the agent is waiting for.
const banner = document.createElement("p");
banner.hidden = true;
document.body.append(banner);

export const stopBanner = onAgentEvent((e) => {
  switch (e.type) {
    case "park": // e.g. Click "Place order" to confirm
      banner.textContent = e.prompt;
      banner.hidden = false;
      break;
    case "result":
    case "error":
    case "cancel":
      banner.hidden = true;
      break;
  }
});

// Later: stopBanner();
