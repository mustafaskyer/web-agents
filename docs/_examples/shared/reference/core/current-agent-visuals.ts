import { currentAgentVisuals } from "@webmcp-agents/core";

// A spotlight switch of your own, beside a provider you have no handle
// on: it drives that provider's cursor, or is disabled without one.
const toggle = document.querySelector<HTMLInputElement>("#spotlight");

if (toggle) {
  toggle.disabled = !currentAgentVisuals();
  toggle.addEventListener("change", () => {
    currentAgentVisuals()?.setSpotlight(toggle.checked);
  });
}
