import { createWebAgents } from "@webmcp-agents/core";

import "@webmcp-agents/core/cursor.css";
import { saveNote, tools } from "./tools";

// Development only: the devtools panel.
if (import.meta.env.DEV) {
  const { installWebAgentsDevtools } = await import(
    "@webmcp-agents/devtools"
  );
  installWebAgentsDevtools();
}

createWebAgents({ tools });

// A person submits this.
const form = document.querySelector("form")!;

form.addEventListener("submit", (event) => {
  event.preventDefault();

  saveNote(String(new FormData(form).get("text")));
  form.reset();
});
