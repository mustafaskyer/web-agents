import { listToolDescriptors } from "@webmcp-agents/chat";

// The tools on this page right now, as a model reads them.
const tools = await listToolDescriptors();

const res = await fetch("/api/chat", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    messages: [
      {
        id: "u-1",
        role: "user",
        parts: [{ type: "text", text: "Hi" }],
      },
    ],
    tools,
    page: { url: location.href },
  }),
});
console.log(res.status);
