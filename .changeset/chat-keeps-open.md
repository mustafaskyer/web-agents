---
"@webmcp-agents/chat": patch
---

`<AgentChat>` keeps whether its panel is open in sessionStorage next to the conversation (`<storageKey>:open`), so a page load (a navigation an agent made without the app's router, a reload) brings the chat back open.
