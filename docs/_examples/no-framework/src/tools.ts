import { defineWebTool } from "@webmcp-agents/core";

const notes: string[] = [];

// One function, two callers.
export function saveNote(text: string) {
  notes.push(text);
  document.querySelector("#notes")!.textContent = notes.join(" · ");

  return `Saved: ${text}`;
}

// An agent calls this.
const saveNoteTool = defineWebTool({
  id: "save_note",
  title: "Save note",
  description:
    "Save a note. Use when the user asks you to write something down.",
  inputSchema: {
    type: "object",
    properties: {
      text: { type: "string", description: "The note, e.g. Buy milk" },
    },
    required: ["text"],
  },
  execute: ({ text }: { text: string }) => saveNote(text),
});

export const tools = { saveNote: saveNoteTool };
