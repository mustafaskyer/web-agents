import { createWebAgents } from "@webmcp-agents/core";

import "@webmcp-agents/core/cursor.css";
import { saveNote, tools } from "./tools";

createWebAgents({ tools });

// Development only: the devtools panel, wired to the cursor above.
// <WebAgentsProvider> installs it itself; createWebAgents cannot,
// since the devtools are built on this package.
if (import.meta.env.DEV) {
  const { installWebAgentsDevtools } = await import(
    "@webmcp-agents/devtools"
  );
  installWebAgentsDevtools();
}

// A person submits this.
const form = document.querySelector("form")!;

form.addEventListener("submit", (event) => {
  event.preventDefault();

  saveNote(String(new FormData(form).get("text")));
  form.reset();
});
