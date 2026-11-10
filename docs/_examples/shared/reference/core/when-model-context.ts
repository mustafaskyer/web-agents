import { whenModelContext } from "@webmcp-agents/core";

// Show how many tools the page has, once it has
// document.modelContext: native, or the polyfill once it loads.
const count = document.querySelector("#tool-count");

const stopWaiting = whenModelContext((modelContext) => {
  const show = async () => {
    const tools = await modelContext.getTools();
    if (count) count.textContent = String(tools.length);
  };

  modelContext.addEventListener("toolchange", show);
  void show();
});

// Leaving before it arrived? Stop waiting.
addEventListener("pagehide", stopWaiting);
